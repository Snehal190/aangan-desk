import type { CriterionKey, LeadStatus, Verdict } from "./types";

// Mirrors knowledge/qualified.md (Nikhil's rubric). Keep the two in sync.
export const CRITERIA: Record<CriterionKey, { label: string; question: string }> = {
  real_project: {
    label: "Real project, not just advice",
    question: "Do they want design and execution?",
  },
  service_area: {
    label: "In our service area",
    question: "Is the site in Pune city or PCMC?",
  },
  timeline: {
    label: "Realistic timeline",
    question: "Can execution start within 8–10 weeks of consultation?",
  },
  budget: {
    label: "Right budget band",
    question: "If they volunteered a number, is it broadly realistic?",
  },
  decision_maker: {
    label: "Decision-maker on the call",
    question: "Are they the decider, or authorised by them?",
  },
};

export const CRITERIA_ORDER: CriterionKey[] = [
  "real_project",
  "service_area",
  "timeline",
  "budget",
  "decision_maker",
];

export const STATUS_META: Record<LeadStatus, { label: string; short: string }> = {
  qualified: { label: "Qualified", short: "Qualified" },
  needs_review: { label: "Needs review", short: "Review" },
  not_fit: { label: "Not qualified", short: "Not qualified" },
  escalation: { label: "Escalation", short: "Escalate" },
};

export const VERDICT_META: Record<Verdict, { label: string }> = {
  pass: { label: "Pass" },
  unclear: { label: "Unclear" },
  fail: { label: "Fail" },
};
