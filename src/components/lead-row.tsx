import Link from "next/link";
import { getDesigner } from "@/lib/designers";
import { duration, when } from "@/lib/format";
import type { Lead, LeadStatus } from "@/lib/types";
import { Flag, PriorityPill, StatusPill } from "./pills";

const CARD: Record<LeadStatus, string> = {
  qualified: "bg-white",
  needs_review: "bg-lavender/70",
  not_fit: "bg-blush/70",
  escalation: "bg-white ring-2 ring-ink",
};

const REASON_TONE: Record<LeadStatus, string> = {
  qualified: "text-sage-deep",
  needs_review: "text-lavender-deep",
  not_fit: "text-coral-deep",
  escalation: "text-coral-deep",
};

/** The one line that explains the verdict, shown right on the card. */
export function verdictLine(lead: Lead) {
  if (lead.status === "qualified") return lead.priorityReason;
  if (lead.status === "not_fit") {
    const fails = lead.criteria.filter((c) => c.verdict === "fail").map((c) => c.reason);
    return fails.length ? `Why not: ${fails.join(" ")}` : lead.handoffNote;
  }
  return lead.nextStep;
}

export function LeadRow({ lead }: { lead: Lead }) {
  const designer = getDesigner(lead.booking?.designerId);
  const reason = verdictLine(lead);
  return (
    <Link
      href={`/desk/leads/${lead.id}`}
      className={`group block rounded-[2rem] p-5 shadow-soft transition-transform duration-500 hover:-translate-y-0.5 sm:p-6 ${CARD[lead.status]}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusPill status={lead.status} />
        {lead.priority && <PriorityPill priority={lead.priority} />}
        <span className="text-sm text-stone-400">
          {when(lead.receivedAt)} · {duration(lead.durationSec)}
          {lead.email ? ` · ${lead.email}` : ""}
        </span>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-4">
        <h3 className="text-xl font-medium tracking-tight text-stone-800 transition-colors duration-500 group-hover:text-coral-deep">
          {lead.callerName}
        </h3>
        <span aria-hidden className="text-muted transition-transform duration-500 group-hover:translate-x-1">→</span>
      </div>
      <p className="mt-1 text-[15px] text-muted">{lead.headline}</p>
      {reason && <p className={`mt-3 text-[15px] leading-snug ${REASON_TONE[lead.status]}`}>{reason}</p>}
      {(lead.booking || lead.status === "qualified" || lead.flags.length > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {lead.booking && designer && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs ${
                lead.booking.status === "confirmed" ? "bg-sage text-sage-deep" : "bg-lavender text-lavender-deep"
              }`}
            >
              {lead.booking.status === "confirmed" ? "Booked" : "Slot held, not on calendar"} · {designer.name} ·{" "}
              {when(lead.booking.start)}
            </span>
          )}
          {lead.status === "qualified" && !lead.booking && (
            <span className="rounded-full bg-blush px-2.5 py-0.5 text-xs text-coral-deep">Needs a booking</span>
          )}
          {lead.flags.map((f) => (
            <Flag key={f}>{f}</Flag>
          ))}
        </div>
      )}
    </Link>
  );
}
