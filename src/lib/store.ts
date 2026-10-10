import { neon } from "@neondatabase/serverless";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { needsAttention } from "./decision";
import { formatIST } from "./format";
import { env } from "./integrations/env";
import { SEED_LEADS } from "./seed";
import type { Enquiry, Lead, LeadStatus } from "./types";

// Neon Postgres when DATABASE_URL is set (table created by `npm run db:setup`).
// Without it, a JSON file under .data/ (seeded with the sample calls) so local
// calls from the webhook and test-call page show up on the dashboard too.
// Each lead is one jsonb row — the report shape is still evolving.
const sql = env.databaseUrl ? neon(env.databaseUrl) : undefined;
const FILE = path.join(process.cwd(), ".data", "leads.json");
const ENQ_FILE = path.join(process.cwd(), ".data", "enquiries.json");

function readJson<T>(file: string, fallback: T[]): T[] {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T[];
  } catch {
    return [...fallback];
  }
}

function writeJson(file: string, rows: unknown[]) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(rows, null, 2));
}

const readFile = () => readJson<Lead>(FILE, SEED_LEADS);
const writeFile = (leads: Lead[]) => writeJson(FILE, leads);

async function all(): Promise<Lead[]> {
  if (!sql) return readFile().sort((x, y) => y.receivedAt.localeCompare(x.receivedAt));
  const rows = await sql`select data from leads order by received_at desc`;
  return rows.map((r) => r.data as Lead);
}

export async function listLeads(filter?: { status?: LeadStatus; designerId?: string }) {
  return (await all())
    .filter((l) => !filter?.status || l.status === filter.status)
    .filter((l) => !filter?.designerId || l.booking?.designerId === filter.designerId);
}

export async function getLead(id: string) {
  if (!sql) return readFile().find((l) => l.id === id);
  const rows = await sql`select data from leads where id = ${id}`;
  return rows[0]?.data as Lead | undefined;
}

export async function saveLead(lead: Lead) {
  if (!sql) {
    const leads = readFile();
    const i = leads.findIndex((l) => l.id === lead.id);
    if (i === -1) leads.push(lead);
    else leads[i] = lead;
    writeFile(leads);
    return lead;
  }
  await sql`
    insert into leads (id, received_at, status, data)
    values (${lead.id}, ${lead.receivedAt}, ${lead.status}, ${JSON.stringify(lead)})
    on conflict (id) do update set received_at = excluded.received_at, status = excluded.status, data = excluded.data`;
  return lead;
}

export async function getStats() {
  const leads = await all();
  const decided = leads.filter((l) => l.status !== "escalation");
  const qualified = leads.filter((l) => l.status === "qualified");
  const afterHours = leads.filter((l) => {
    const h = Number(formatIST(l.receivedAt, { hour: "numeric", hour12: false }));
    return h < 10 || h >= 19;
  });
  return {
    now: new Date().toISOString(),
    calls: leads.length,
    avgPickupSec: leads.reduce((s, l) => s + l.pickupSec, 0) / Math.max(leads.length, 1),
    qualifiedPct: Math.round((qualified.length / Math.max(decided.length, 1)) * 100),
    booked: leads.filter((l) => l.booking?.status === "confirmed").length,
    afterHours: afterHours.length,
    needsAttention: leads.filter(needsAttention).length,
  };
}

// ── Enquiries (website calls in flight) ────────────────────────────────────

export async function saveEnquiry(e: Enquiry) {
  if (!sql) {
    const rows = readJson<Enquiry>(ENQ_FILE, []);
    const i = rows.findIndex((r) => r.id === e.id);
    if (i === -1) rows.push(e);
    else rows[i] = e;
    writeJson(ENQ_FILE, rows);
    return e;
  }
  await sql`
    insert into enquiries (id, room_name, created_at, data)
    values (${e.id}, ${e.roomName ?? null}, ${e.startedAt}, ${JSON.stringify(e)})
    on conflict (id) do update set room_name = excluded.room_name, data = excluded.data`;
  return e;
}

export async function getEnquiry(id: string) {
  if (!sql) return readJson<Enquiry>(ENQ_FILE, []).find((e) => e.id === id);
  const rows = await sql`select data from enquiries where id = ${id}`;
  return rows[0]?.data as Enquiry | undefined;
}

export async function findEnquiryByRoom(roomName: string) {
  if (!sql) return readJson<Enquiry>(ENQ_FILE, []).find((e) => e.roomName === roomName);
  const rows = await sql`select data from enquiries where room_name = ${roomName}`;
  return rows[0]?.data as Enquiry | undefined;
}

/** Calls that are live or still being written up (last 24 hours). */
export async function listOpenEnquiries() {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const rows: Enquiry[] = !sql
    ? readJson<Enquiry>(ENQ_FILE, [])
    : ((await sql`select data from enquiries where created_at > ${since}`).map((r) => r.data) as Enquiry[]);
  return rows
    .filter((e) => e.status !== "done" && e.startedAt > since)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/** A "processing" attempt older than this is assumed dead (server restart,
 *  function timeout) and may be claimed again. */
const STALE_MS = 6 * 60_000;

/** Atomically move an enquiry to "processing" so the webhook and the
 *  end-of-call fetch never write the same report twice. */
export async function claimEnquiry(id: string): Promise<Enquiry | undefined> {
  const now = new Date().toISOString();
  const staleBefore = new Date(Date.now() - STALE_MS).toISOString();
  if (!sql) {
    const e = await getEnquiry(id);
    if (!e || e.status === "done") return undefined;
    if (e.status === "processing" && (e.processingAt ?? e.endedAt ?? e.startedAt) > staleBefore) return undefined;
    return saveEnquiry({ ...e, status: "processing", processingAt: now });
  }
  const rows = await sql`
    update enquiries
       set data = data || jsonb_build_object('status', 'processing', 'processingAt', ${now}::text)
     where id = ${id}
       and (data->>'status' in ('live', 'failed')
            or (data->>'status' = 'processing'
                and coalesce(data->>'processingAt', data->>'endedAt', data->>'startedAt') < ${staleBefore}))
    returning data`;
  return rows[0]?.data as Enquiry | undefined;
}

