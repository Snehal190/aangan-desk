# Aangan Desk

Console for the Aangan Studio front desk and designers. Every call the voice
agent answers becomes a report: why it was qualified (or not) against Nikhil's
rubric, a handoff note, what not to re-ask, the booked consultation, and the
full transcript. Nikhil sees the same leads in HubSpot.

```
Website "Enquire" (name + mobile)
  └─▶ /api/enquiry/start ─▶ Vaani AI WebRTC call (our prompt from /knowledge + open slots)
        visitor talks to the agent in the browser; agent books a slot if qualified
  └─▶ hang-up ─▶ /api/enquiry/end ─┐
      Vaani webhook (call_postprocessing) ─┴▶ transcript ─▶ Gemini rubric + handoff note
                                              ├─▶ booking (Cal.com when connected, else "held")
                                              ├─▶ Resend email to the designer
                                              └─▶ /desk dashboard (+ HubSpot later)
```

`/` is the public Aangan site; `/desk` is the team dashboard (passcode).

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local`. With no `DATABASE_URL` the console uses the
sample calls in memory; with one, run `npm run db:setup -- --seed` once to
create the table (drop `--seed` to start empty). Sign in with `TEAM_PASSCODE`.

## Deploy (Vercel + Neon)

1. Import the GitHub repo in Vercel (framework: Next.js, no overrides).
2. Paste the variables from `.env.vercel` into Project → Settings → Environment
   Variables, with `APP_URL` set to the deployed URL.
3. Run `npm run db:setup` against the Neon database once.
4. In Vaani → Settings → Webhooks, add
   `<APP_URL>/api/webhooks/vaani?key=<VAANI_WEBHOOK_SECRET>`.

## Where things live

| Path | What |
|---|---|
| `knowledge/` | services, rubric, pricing policy, past enquiries — the agent reads these |
| `src/lib/seed.ts` | sample calls |
| `src/lib/store.ts` | data access — Neon, or in-memory without `DATABASE_URL` |
| `src/lib/auth.ts`, `src/proxy.ts` | shared-passcode login for front desk + designers |
| `src/lib/integrations/` | one file per service; Gemini rotates across `GEMINI_API_KEYS` |
| `src/lib/pipeline/process-call.ts` | what happens after a call ends |
| `src/app/` | inbox `/`, report `/leads/[id]`, designer view `/designer`, `/setup`, `/login` |

## Decisions so far

- Pricing: the agent may share the indicative range from `pricing.md`, always
  with "the designer gives the final quote" — never a firm number.
- One designer for now: Snehal Kapoor (snehalbandi5@gmail.com). Bookings block
  that calendar; the handoff email goes there too.
- Everyone with the passcode sees every lead: qualified (ranked by priority),
  needs review, escalations, and not qualified with the reason.

## Still needed

- Neon `DATABASE_URL`
- Cal.com API key, username and event slug
- A working Vaani AI API key and the agent ID (Agent Config → Agent ID)
- HubSpot private app token, pipeline and stage IDs
