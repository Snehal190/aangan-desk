import { requireSession } from "@/lib/session";
import Link from "next/link";
import { after } from "next/server";
import { LeadRow } from "@/components/lead-row";
import { LiveRefresh } from "@/components/live-refresh";
import { Stamp } from "@/components/pills";
import { Reveal } from "@/components/reveal";
import { agentDecision, needsAttention } from "@/lib/decision";
import { when } from "@/lib/format";
import { retryStuckEnquiries } from "@/lib/pipeline/enquiry";
import { STATUS_META } from "@/lib/rubric";
import { getStats, listLeads, listOpenEnquiries } from "@/lib/store";
import type { Enquiry, LeadStatus } from "@/lib/types";
import { retryEnquiry } from "./actions";

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All calls" },
  { key: "attention", label: "Needs you" },
  ...(["qualified", "not_fit", "needs_review", "escalation"] as LeadStatus[]).map((s) => ({ key: s, label: STATUS_META[s].label })),
];

export default async function Inbox({ searchParams }: PageProps<"/desk">) {
  await requireSession();
  const raw = (await searchParams).status;
  const filter = typeof raw === "string" && FILTERS.some((f) => f.key === raw) ? raw : "all";

  const [all, stats, inFlight] = await Promise.all([listLeads(), getStats(), listOpenEnquiries()]);
  // Vaani's webhook can't reach a laptop, so the dashboard also picks up late transcripts.
  if (inFlight.some((e) => e.status !== "live" || e.endedAt)) after(() => retryStuckEnquiries());

  const attention = all.filter(needsAttention);
  // Newest call first, always — listLeads() is already sorted by time.
  const shown = filter === "all" ? all : filter === "attention" ? attention : all.filter((l) => l.status === filter);
  const nowMs = Date.parse(stats.now);

  return (
    <div className="space-y-12">
      <LiveRefresh seconds={8} />
      <Reveal className="pt-2">
        <h1 className="text-4xl leading-tight font-medium tracking-tight sm:text-5xl">
          Every call, <span className="font-hand text-5xl font-normal text-coral-deep sm:text-6xl">answered</span>
        </h1>
        <p className="mt-2 max-w-[560px] text-muted">
          {stats.calls} calls so far, {stats.afterHours} after hours. Newest calls appear at the top as soon as they end.
        </p>
      </Reveal>

      <Reveal>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Avg pickup", value: `${stats.avgPickupSec.toFixed(1)}s`, bg: "bg-white" },
            { label: "Qualified", value: `${stats.qualifiedPct}%`, bg: "bg-sage" },
            { label: "Consultations on calendar", value: stats.booked, bg: "bg-lavender" },
            { label: "After-hours calls", value: stats.afterHours, bg: "bg-blush" },
          ].map((s) => (
            <div key={s.label} className={`rounded-[2rem] p-5 shadow-soft ${s.bg}`}>
              <dt className="text-sm text-muted">{s.label}</dt>
              <dd className="mt-2 text-4xl font-medium tracking-tight">{s.value}</dd>
            </div>
          ))}
        </dl>
      </Reveal>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 px-1">
          <h2 className="text-2xl font-medium tracking-tight">
            Latest <span className="font-hand text-4xl font-normal text-coral-deep">calls</span>
          </h2>
          <span className="text-sm text-stone-400">Newest first · updates every few seconds</span>
        </div>
        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/desk" : `/desk?status=${f.key}`}
              scroll={false}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-500 ${
                filter === f.key ? "bg-ink text-cream" : "border border-stone-200 bg-white text-muted hover:text-ink"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {filter === "all" && inFlight.map((e) => <InFlightRow key={e.id} e={e} />)}
          {shown.length === 0 && inFlight.length === 0 && <p className="py-10 text-center text-muted">Nothing here — lovely.</p>}
          {shown.map((l) => (
            <LeadRow key={l.id} lead={l} isNew={nowMs - Date.parse(l.receivedAt) < 15 * 60_000} />
          ))}
        </div>
      </section>

      {attention.length > 0 && filter === "all" && (
        <Reveal>
          <h2 className="px-1 text-2xl font-medium tracking-tight">
            Waiting on <span className="font-hand text-4xl font-normal text-coral-deep">you</span>
          </h2>
          <div className="no-scrollbar -mx-4 mt-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
            {attention.map((l) => (
              <Link
                key={l.id}
                href={`/desk/leads/${l.id}`}
                className="group flex h-40 w-72 shrink-0 snap-start flex-col justify-between rounded-3xl bg-white p-5 shadow-soft"
              >
                <span className="flex items-center justify-between text-sm text-stone-400">
                  {when(l.receivedAt)}
                  <Stamp status={l.status} />
                </span>
                <span>
                  <span className="block text-sm text-muted">{l.callerName}</span>
                  <span className="line-clamp-2 text-xl leading-snug text-stone-800 transition-colors duration-500 group-hover:text-coral-deep">
                    {l.status === "qualified" ? agentDecision(l).title : (l.nextStep ?? agentDecision(l).title)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </Reveal>
      )}
    </div>
  );
}

/** A website call that's live or still being written up — shown on top of the list. */
function InFlightRow({ e }: { e: Enquiry }) {
  const label =
    e.status === "live" && !e.endedAt
      ? "On a call with the agent right now"
      : e.status === "failed"
        ? "Waiting for Vaani's transcript"
        : "Call ended · writing the report — usually under a minute";
  return (
    <div className="flex items-center gap-4 rounded-[2rem] border-2 border-dashed border-stone-200 bg-white/70 p-5 sm:p-6">
      <span className={`size-3 shrink-0 rounded-full ${e.status === "failed" ? "bg-lavender-deep" : "animate-pulse bg-sage-deep"}`} />
      <div className="min-w-0 flex-1">
        <p className="text-xl font-medium tracking-tight">{e.name}</p>
        <p className="text-sm text-muted">
          {label} · started {when(e.startedAt)}
        </p>
        {e.status === "failed" && (
          <form action={retryEnquiry} className="mt-2">
            <input type="hidden" name="id" value={e.id} />
            <button className="rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-muted hover:text-ink">
              Fetch transcript again
            </button>
          </form>
        )}
      </div>
      <Stamp status="processing" />
    </div>
  );
}
