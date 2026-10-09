import { LiveRefresh } from "@/components/live-refresh";
import { requireSession } from "@/lib/session";
import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { Flag } from "@/components/pills";
import { DESIGNERS, getDesigner } from "@/lib/designers";
import { dayLabel, MODE_LABEL, timeOnly } from "@/lib/format";
import { listLeads } from "@/lib/store";
import type { Lead } from "@/lib/types";

// Until sign-in exists, the designer picks themselves from the pills.
export default async function DesignerView({ searchParams }: PageProps<"/designer">) {
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
              href={`/designer?d=${d.id}`}
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

      {[...byDay.entries()].map(([day, leads]) => (
        <Reveal key={day}>
          <h2 className="px-1 text-sm font-medium text-muted">{day}</h2>
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
      href={`/leads/${lead.id}`}
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
        <p className="text-[15px] text-muted">{lead.headline}</p>
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
