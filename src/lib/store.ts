import { neon } from "@neondatabase/serverless";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { needsAttention } from "./decision";
import { formatIST } from "./format";
import { env } from "./integrations/env";
import { SEED_LEADS } from "./seed";
import type { Lead, LeadStatus } from "./types";

// Neon Postgres when DATABASE_URL is set (table created by `npm run db:setup`).
// Without it, a JSON file under .data/ (seeded with the sample calls) so local
// calls from the webhook and test-call page show up on the dashboard too.
// Each lead is one jsonb row — the report shape is still evolving.
const sql = env.databaseUrl ? neon(env.databaseUrl) : undefined;
const FILE = path.join(process.cwd(), ".data", "leads.json");

function readFile(): Lead[] {
  try {
    return JSON.parse(readFileSync(FILE, "utf8")) as Lead[];
  } catch {
    return [...SEED_LEADS];
  }
}

function writeFile(leads: Lead[]) {
  mkdirSync(path.dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(leads, null, 2));
}

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
    calls: leads.length,
    avgPickupSec: leads.reduce((s, l) => s + l.pickupSec, 0) / Math.max(leads.length, 1),
    qualifiedPct: Math.round((qualified.length / Math.max(decided.length, 1)) * 100),
    booked: leads.filter((l) => l.booking?.status === "confirmed").length,
    afterHours: afterHours.length,
    needsAttention: leads.filter(needsAttention).length,
  };
}
