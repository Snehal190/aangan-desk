// Shared shapes for a call → lead → report.
// The voice agent (Vaani) produces the transcript, Gemini fills in the
// structured fields, and the console renders them.

export type LeadStatus =
  | "qualified" // passed the rubric; designer call booked (or being booked)
  | "needs_review" // agent couldn't decide; front desk follows up
  | "not_fit" // closed gracefully on the call
  | "escalation"; // existing client / complaint, not a new enquiry

export type CriterionKey =
  | "real_project"
  | "service_area"
  | "timeline"
  | "budget"
  | "decision_maker";

export type Verdict = "pass" | "unclear" | "fail";

export type Priority = "high" | "medium" | "low";

export interface CriterionResult {
  key: CriterionKey;
  verdict: Verdict;
  /** One or two sentences: why the agent decided this. */
  reason: string;
  /** Index into `transcript` of the line that proves it. */
  evidenceTurn?: number;
}

export interface TranscriptTurn {
  speaker: "agent" | "caller";
  text: string;
  /** Offset from call start, "m:ss". */
  at: string;
}

export interface Designer {
  id: string;
  name: string;
  email: string;
  calUsername: string;
}

export interface Booking {
  designerId: string;
  /** ISO timestamp. */
  start: string;
  durationMin: number;
  mode: "site_visit" | "studio" | "video";
  /** confirmed = on the designer's Cal.com calendar; held = agreed on the
   *  call but not yet on the calendar (Cal.com not connected or it failed). */
  status: "confirmed" | "held";
  calBookingUid?: string;
  emailSentAt?: string;
}

export interface ProjectFacts {
  kind: "residential" | "commercial" | "unknown";
  summary: string;
  location?: string;
  carpetSqft?: number;
  rooms: string[];
  currentState?: string;
  timeline?: string;
  /** Only if the caller volunteered it. The agent never asks. */
  budgetVolunteered?: string;
  decisionMaker?: string;
  referral?: string;
}

export interface Lead {
  id: string;
  callerName: string;
  /** Spoken by the caller and read back by the agent to confirm. */
  email?: string;
  emailConfirmed?: boolean;
  /** Only for phone calls; website calls have none. */
  phone?: string;
  language: string;
  receivedAt: string;
  durationSec: number;
  /** Seconds until the agent picked up. */
  pickupSec: number;
  status: LeadStatus;
  /** Qualified leads only: how soon the designer should give this attention. */
  priority?: Priority;
  priorityReason?: string;
  /** One line shown in lists. */
  headline: string;
  project: ProjectFacts;
  criteria: CriterionResult[];
  /** Written by Gemini for the designer. */
  handoffNote: string;
  /** Questions already answered on the call — designer shouldn't re-ask. */
  alreadyAnswered: string[];
  /** Things the designer should cover at the consultation. */
  openQuestions: string[];
  flags: string[];
  booking?: Booking;
  /** Next step for the front desk when status is needs_review / escalation. */
  nextStep?: string;
  transcript: TranscriptTurn[];
  hubspotDealId?: string;
}

/** A website enquiry call, tracked from "Call us" to finished report. */
export interface Enquiry {
  id: string;
  name: string;
  /** Left on the website if the call couldn't connect. */
  email?: string;
  startedAt: string;
  endedAt?: string;
  roomName?: string;
  status: "live" | "processing" | "done" | "failed";
  leadId?: string;
  error?: string;
}
