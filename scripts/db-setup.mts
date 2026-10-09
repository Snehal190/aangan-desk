// Creates the leads table in Neon. Pass --seed to also load the sample calls.
//   npm run db:setup            (table only)
//   npm run db:setup -- --seed  (table + sample calls)
import { neon } from "@neondatabase/serverless";
import { SEED_LEADS } from "../src/lib/seed.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = neon(url);

await sql`
  create table if not exists leads (
    id          text primary key,
    received_at timestamptz not null,
    status      text not null,
    data        jsonb not null
  )`;
await sql`create index if not exists leads_received_at on leads (received_at desc)`;
await sql`
  create table if not exists enquiries (
    id         text primary key,
    room_name  text unique,
    created_at timestamptz not null,
    data       jsonb not null
  )`;
console.log("leads + enquiries tables ready");

if (process.argv.includes("--seed")) {
  for (const l of SEED_LEADS) {
    await sql`
      insert into leads (id, received_at, status, data)
      values (${l.id}, ${l.receivedAt}, ${l.status}, ${JSON.stringify(l)})
      on conflict (id) do update set data = excluded.data, status = excluded.status`;
  }
  console.log(`seeded ${SEED_LEADS.length} sample calls`);
}
