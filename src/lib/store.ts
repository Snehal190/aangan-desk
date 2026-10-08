import { neon } from "@neondatabase/serverless";
import { env } from "./integrations/env";
import { SEED_LEADS } from "./seed";
import type { Lead, LeadStatus } from "./types";

// Neon Postgres when DATABASE_URL is set (table created by `npm run db:setup`);
// otherwise an in-memory copy of the sample calls so local dev still works.
// Each lead is one jsonb row — the report shape is still evolving.
const sql = env.databaseUrl ? neon(env.databaseUrl) : undefined;
const memory: Lead[] = [...SEED_LEADS];

async function all(): Promise<Lead[]> {
  if (!sql) return [...memory].sort((x, y) => y.receivedAt.localeCompare(x.receivedAt));
  const rows = await sql`select data from leads order by received_at desc`;
  return rows.map((r) => r.data as Lead);
}

export async function listLeads(filter?: { status?: LeadStatus; designerId?: string }) {
  return (await all())
    .filter((l) => !filter?.status || l.status === filter.status)
    .filter((l) => !filter?.designerId || l.booking?.designerId === filter.designerId);
}

export async function getLead(id: string) {
  if (!sql) return memory.find((l) => l.id === id);
  const rows = await sql`select data from leads where id = ${id}`;
  return rows[0]?.data as Lead | undefined;
}

export async function saveLead(lead: Lead) {
  if (!sql) {
    const i = memory.findIndex((l) => l.id === lead.id);
    if (i === -1) memory.push(lead);
    else memory[i] = lead;
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
    booked: leads.filter((l) => l.booking).length,
    afterHours: afterHours.length,
    needsAttention: leads.filter((l) => l.status === "needs_review" || l.status === "escalation").length,
  };
}

export function formatIST(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", ...opts }).format(new Date(iso));
}
