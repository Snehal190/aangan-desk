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

const STAMP: Record<LeadStatus | "processing", { text: string; cls: string }> = {
  qualified: { text: "Qualified", cls: "border-sage-deep text-sage-deep" },
  not_fit: { text: "Not qualified", cls: "border-coral-deep text-coral-deep" },
  needs_review: { text: "Needs review", cls: "border-lavender-deep text-lavender-deep" },
  escalation: { text: "Escalation", cls: "border-ink text-ink" },
  processing: { text: "Processing", cls: "border-stone-400 text-stone-500 border-dashed" },
};

/** Rubber-stamp verdict, so the outcome reads at a glance. */
export function Stamp({ status, large = false }: { status: LeadStatus | "processing"; large?: boolean }) {
  const st = STAMP[status];
  return (
    <span
      className={`inline-block shrink-0 -rotate-6 rounded-xl border-2 font-semibold tracking-[0.14em] uppercase ${st.cls} ${
        large ? "px-4 py-1.5 text-base" : "px-2.5 py-1 text-[11px]"
      }`}
    >
      {st.text}
    </span>
  );
}
