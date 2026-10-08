import { requireSession } from "@/lib/session";
import Link from "next/link";
import { LeadRow } from "@/components/lead-row";
import { Reveal } from "@/components/reveal";
import { when } from "@/lib/format";
import { STATUS_META } from "@/lib/rubric";
import { getStats, listLeads } from "@/lib/store";
import type { Lead, LeadStatus, Priority } from "@/lib/types";

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All calls" },
  { key: "attention", label: "Needs you" },
  ...(["qualified", "needs_review", "not_fit", "escalation"] as LeadStatus[]).map((s) => ({ key: s, label: STATUS_META[s].label })),
];

const RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const newest = (a: Lead, b: Lead) => b.receivedAt.localeCompare(a.receivedAt);

// The list is grouped by verdict; qualified leads are ranked by priority.
const GROUPS: { status: LeadStatus; title: string; hint: string; dot: string; sort: (a: Lead, b: Lead) => number }[] = [
  { status: "escalation", title: "Escalations", hint: "Existing clients who need a senior callback", dot: "bg-ink", sort: newest },
  { status: "needs_review", title: "Needs review", hint: "The agent couldn't decide — a person should follow up", dot: "bg-lavender-deep", sort: newest },
  {
    status: "qualified",
    title: "Qualified",
    hint: "Designer call booked · highest priority first",
    dot: "bg-sage-deep",
    sort: (a, b) => RANK[a.priority ?? "low"] - RANK[b.priority ?? "low"] || newest(a, b),
  },
  { status: "not_fit", title: "Not qualified", hint: "Closed politely on the call — reason on each card", dot: "bg-coral-deep", sort: newest },
];

export default async function Inbox({ searchParams }: PageProps<"/">) {
  await requireSession();
  const raw = (await searchParams).status;
  const filter = typeof raw === "string" && FILTERS.some((f) => f.key === raw) ? raw : "all";

  const [all, stats] = await Promise.all([listLeads(), getStats()]);
  const attention = all.filter((l) => l.status === "needs_review" || l.status === "escalation");
  const shown =
    filter === "all" ? all : filter === "attention" ? attention : all.filter((l) => l.status === filter);

  return (
    <div className="space-y-16">
      <Reveal className="pt-6 text-center">
        <h1 className="text-5xl leading-[1.05] font-medium tracking-tight sm:text-7xl">
          Every call,{" "}
          <span className="font-hand text-6xl font-normal text-coral-deep sm:text-8xl">answered</span>
        </h1>
        <p className="mx-auto mt-5 max-w-[500px] text-lg text-muted">
          The voice agent picked up {stats.calls} calls, {stats.afterHours} of them after hours. Here&rsquo;s what came
          in, why each one was qualified or not, and what&rsquo;s waiting on you.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/?status=attention"
            className="rounded-full bg-coral px-6 py-3 font-medium text-ink shadow-coral transition-transform duration-500 hover:scale-[1.03]"
          >
            See what needs you
          </Link>
          <Link
            href="/designer"
            className="rounded-full border border-stone-200 bg-white px-6 py-3 font-medium text-ink transition-transform duration-500 hover:scale-[1.03]"
          >
            Designer view
          </Link>
        </div>
      </Reveal>

      <Reveal>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Avg pickup", value: `${stats.avgPickupSec.toFixed(1)}s`, bg: "bg-white" },
            { label: "Qualified", value: `${stats.qualifiedPct}%`, bg: "bg-sage" },
            { label: "Designer calls booked", value: stats.booked, bg: "bg-lavender" },
            { label: "After-hours calls", value: stats.afterHours, bg: "bg-blush" },
          ].map((s) => (
            <div key={s.label} className={`rounded-[2rem] p-5 shadow-soft ${s.bg}`}>
              <dt className="text-sm text-muted">{s.label}</dt>
              <dd className="mt-2 text-4xl font-medium tracking-tight">{s.value}</dd>
            </div>
          ))}
        </dl>
      </Reveal>

      {attention.length > 0 && (
        <Reveal>
          <h2 className="px-1 text-2xl font-medium tracking-tight">
            Waiting on <span className="font-hand text-4xl font-normal text-coral-deep">you</span>
          </h2>
          <div className="no-scrollbar -mx-4 mt-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
            {attention.map((l) => (
              <Link
                key={l.id}
                href={`/leads/${l.id}`}
                className="group flex h-40 w-72 shrink-0 snap-start flex-col justify-between rounded-3xl bg-white p-5 shadow-soft"
              >
                <span className="flex items-center justify-between text-sm text-stone-400">
                  {when(l.receivedAt)}
                  <span
                    className={`size-2 rounded-full ${l.status === "escalation" ? "bg-coral-deep" : "bg-lavender-deep"}`}
                  />
                </span>
                <span>
                  <span className="block text-sm text-muted">{l.callerName}</span>
                  <span className="line-clamp-2 text-xl leading-snug text-stone-800 transition-colors duration-500 group-hover:text-coral-deep">
                    {l.nextStep ?? l.headline}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </Reveal>
      )}

      <section>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/" : `/?status=${f.key}`}
              scroll={false}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-500 ${
                filter === f.key ? "bg-ink text-cream" : "border border-stone-200 bg-white text-muted hover:text-ink"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        {shown.length === 0 && <p className="py-10 text-center text-muted">Nothing here — lovely.</p>}
        {GROUPS.map((g) => {
          const leads = shown.filter((l) => l.status === g.status).sort(g.sort);
          if (leads.length === 0) return null;
          return (
            <div key={g.status} className="mt-10">
              <h2 className="flex items-center gap-2 px-1 text-sm font-medium text-muted">
                <span className={`size-2 rounded-full ${g.dot}`} />
                {g.title} · {leads.length}
              </h2>
              <p className="px-1 pl-5 text-sm text-stone-400">{g.hint}</p>
              <div className="mt-4 space-y-4">
                {leads.map((l, i) => (
                  <Reveal key={l.id} delay={Math.min(i, 4) * 60}>
                    <LeadRow lead={l} />
                  </Reveal>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
