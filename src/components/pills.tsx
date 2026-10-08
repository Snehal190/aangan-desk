import { STATUS_META, VERDICT_META } from "@/lib/rubric";
import type { LeadStatus, Priority, Verdict } from "@/lib/types";

// Qualified = sage, needs review = lavender, not a fit = coral, escalation = ink.
const STATUS_STYLE: Record<LeadStatus, string> = {
  qualified: "bg-sage text-sage-deep",
  needs_review: "bg-lavender text-lavender-deep",
  not_fit: "bg-blush text-coral-deep",
  escalation: "bg-ink text-cream",
};

const DOT: Record<LeadStatus, string> = {
  qualified: "bg-sage-deep",
  needs_review: "bg-lavender-deep",
  not_fit: "bg-coral-deep",
  escalation: "bg-coral",
};

const PRIORITY_STYLE: Record<Priority, string> = {
  high: "bg-coral text-ink",
  medium: "bg-lavender text-lavender-deep",
  low: "bg-stone-100 text-muted",
};

export function PriorityPill({ priority }: { priority: Priority }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${PRIORITY_STYLE[priority]}`}>
      {priority[0].toUpperCase() + priority.slice(1)} priority
    </span>
  );
}

export function StatusPill({ status }: { status: LeadStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[status]}`}>
      <span className={`size-1.5 rounded-full ${DOT[status]}`} />
      {STATUS_META[status].label}
    </span>
  );
}

const VERDICT_STYLE: Record<Verdict, string> = {
  pass: "bg-sage text-sage-deep",
  unclear: "bg-lavender text-lavender-deep",
  fail: "bg-blush text-coral-deep",
};

export function VerdictPill({ verdict }: { verdict: Verdict }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${VERDICT_STYLE[verdict]}`}>
      {VERDICT_META[verdict].label}
    </span>
  );
}

export function Flag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-stone-200 bg-white px-2.5 py-0.5 text-xs text-muted">{children}</span>;
}
