import { LiveRefresh } from "@/components/live-refresh";
import { requireSession } from "@/lib/session";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { Flag } from "@/components/pills";
import { DESIGNERS, getDesigner } from "@/lib/designers";
import { dayLabel, formatIST, MODE_LABEL, timeOnly } from "@/lib/format";

const dayAnchor = (label: string) => `day-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
import { listLeads } from "@/lib/store";
import type { Lead } from "@/lib/types";

// Until sign-in exists, the designer picks themselves from the pills.
export default async function DesignerView({ searchParams }: PageProps<"/desk/designer">) {
  await requireSession();
  const raw = (await searchParams).d;
  const designer = getDesigner(typeof raw === "string" ? raw : undefined) ?? DESIGNERS[0];

  const booked = (await listLeads({ designerId: designer.id })).sort((a, b) => a.booking!.start.localeCompare(b.booking!.start));
  const now = new Date().toISOString();
  const upcoming = booked.filter((l) => l.booking!.start >= now);
  const past = booked.filter((l) => l.booking!.start < now).reverse();

  const byDay = new Map<string, Lead[]>();
  for (const l of upcoming) {
    const k = dayLabel(l.booking!.start);
    byDay.set(k, [...(byDay.get(k) ?? []), l]);
  }

  // Next 7 days at a glance: Today, Tomorrow, Day after, then weekday names (IST).
  const ymd = (d: Date) => formatIST(d.toISOString(), { year: "numeric", month: "2-digit", day: "2-digit" });
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.parse(now) + i * 86_400_000);
    const key = ymd(d);
    const calls = upcoming.filter((l) => ymd(new Date(l.booking!.start)) === key);
    const label = ["Today", "Tomorrow", "Day after"][i] ?? formatIST(d.toISOString(), { weekday: "short" });
    return {
      label,
      date: formatIST(d.toISOString(), { day: "numeric", month: "short" }),
      count: calls.length,
      anchor: calls[0] ? dayAnchor(dayLabel(calls[0].booking!.start)) : undefined,
    };
  });

  return (
    <div className="space-y-12">
      <LiveRefresh />
      <Reveal className="pt-6">
        <h1 className="text-5xl font-medium tracking-tight sm:text-6xl">
          Hi <span className="font-hand text-6xl font-normal text-coral-deep sm:text-7xl">{designer.name}</span>
        </h1>
        <p className="mt-3 max-w-[500px] text-lg text-muted">
          {upcoming.length === 0
            ? "No consultations coming up."
            : `${upcoming.length} consultation${upcoming.length > 1 ? "s" : ""} coming up. Each one has the full call, so you can skip the questions they've already answered.`}
        </p>
        <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {DESIGNERS.map((d) => (
            <Link
              key={d.id}
              href={`/desk/designer?d=${d.id}`}
              scroll={false}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-500 ${
                d.id === designer.id ? "bg-ink text-cream" : "border border-stone-200 bg-white text-muted hover:text-ink"
              }`}
            >
              {d.name}
            </Link>
          ))}
        </div>
      </Reveal>

      <Reveal>
        <h2 className="px-1 text-2xl font-medium tracking-tight">
          Your <span className="font-hand text-4xl font-normal text-coral-deep">week</span>
        </h2>
        <div className="no-scrollbar -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-7 sm:px-0">
          {week.map((d) => {
            const body = (
              <>
                <span className="text-sm text-stone-400">{d.date}</span>
                <span className="text-lg font-medium tracking-tight">{d.label}</span>
                <span className={`mt-2 text-3xl font-medium tracking-tight ${d.count ? "text-ink" : "text-stone-300"}`}>{d.count}</span>
                <span className="text-xs text-muted">{d.count === 1 ? "call" : "calls"}</span>
              </>
            );
            const cls = `flex w-28 shrink-0 flex-col rounded-3xl p-4 shadow-soft sm:w-auto ${d.count ? "bg-sage" : "bg-white"}`;
            return d.anchor ? (
              <a key={d.label} href={`#${d.anchor}`} className={`${cls} transition-transform duration-500 hover:-translate-y-0.5`}>
                {body}
              </a>
            ) : (
              <div key={d.label} className={cls}>
                {body}
              </div>
            );
          })}
        </div>
      </Reveal>

      {[...byDay.entries()].map(([day, leads]) => (
        <Reveal key={day}>
          <h2 id={dayAnchor(day)} className="scroll-mt-28 px-1 text-sm font-medium text-muted">
            {day}
          </h2>
          <div className="mt-3 space-y-4">
            {leads.map((l) => (
              <BookingCard key={l.id} lead={l} />
            ))}
          </div>
        </Reveal>
      ))}

      {past.length > 0 && (
        <Reveal>
          <h2 className="px-1 text-sm font-medium text-muted">Earlier</h2>
          <div className="mt-3 space-y-4 opacity-70">
            {past.map((l) => (
              <BookingCard key={l.id} lead={l} />
            ))}
          </div>
        </Reveal>
      )}
    </div>
  );
}

function BookingCard({ lead }: { lead: Lead }) {
  const b = lead.booking!;
  return (
    <Link
      href={`/desk/leads/${lead.id}`}
      className="group grid gap-4 rounded-[2rem] bg-white p-5 shadow-soft transition-transform duration-500 hover:-translate-y-0.5 sm:grid-cols-[120px_1fr] sm:p-6"
    >
      <div>
        <p className="text-3xl font-medium tracking-tight">{timeOnly(b.start)}</p>
        <p className="text-sm text-muted">
          {MODE_LABEL[b.mode]} · {b.durationMin}m
        </p>
      </div>
      <div>
        <h3 className="text-xl font-medium tracking-tight text-stone-800 transition-colors duration-500 group-hover:text-coral-deep">
          {lead.callerName}
        </h3>
        <p className="text-[15px] text-muted">
          {lead.headline}
          {lead.email ? ` · ${lead.email}` : ""}
        </p>
        <p className="mt-3 line-clamp-2 text-[15px] text-stone-600">{lead.handoffNote}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-sage px-2.5 py-0.5 text-xs text-sage-deep">
            {lead.alreadyAnswered.length} answered already
          </span>
          {lead.flags.map((f) => (
            <Flag key={f}>{f}</Flag>
          ))}
        </div>
      </div>
    </Link>
  );
}
