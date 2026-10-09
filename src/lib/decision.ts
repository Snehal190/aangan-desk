import { getDesigner } from "./designers";
import { MODE_LABEL, when } from "./format";
import { CRITERIA } from "./rubric";
import type { Lead } from "./types";

// The agent's own account of what it decided and did, in first person.
// Built from the structured report so it never claims more than happened.
export function agentDecision(lead: Lead): { title: string; body: string } {
  const name = lead.callerName.split(" ")[0] || "The caller";
  const fails = lead.criteria.filter((c) => c.verdict === "fail");
  const unclear = lead.criteria.filter((c) => c.verdict === "unclear");

  switch (lead.status) {
    case "qualified": {
      const passed = lead.criteria.filter((c) => c.verdict === "pass").length;
      const why = `${name} qualified — ${passed} of 5 checks passed${
        unclear.length ? `, ${unclear.map((c) => CRITERIA[c.key].label.toLowerCase()).join(" and ")} noted as unclear` : ""
      }.`;
      const b = lead.booking;
      const designer = getDesigner(b?.designerId);
      if (b && designer && b.status === "confirmed") {
        return {
          title: "Qualified · designer's calendar blocked",
          body: `${why} So I blocked ${designer.name}'s calendar: ${when(b.start)}, ${MODE_LABEL[b.mode].toLowerCase()}.${
            lead.email && lead.emailConfirmed ? ` The invite went to ${lead.email}.` : ""
          }${b.emailSentAt ? ` The full report has been emailed to ${designer.name}.` : ""}`,
        };
      }
      if (b && designer) {
        return {
          title: "Qualified · slot agreed, not yet on calendar",
          body: `${why} ${name} agreed to ${when(b.start)} (${MODE_LABEL[b.mode].toLowerCase()}) with ${designer.name}.${
            b.emailSentAt ? ` The full report has been emailed to ${designer.name}.` : ""
          } Cal.com isn't connected yet, so please block this on the calendar and confirm with the caller.`,
        };
      }
      return {
        title: "Qualified · needs a booking",
        body: `${why} No slot was agreed on the call — please call back and book a consultation.`,
      };
    }
    case "not_fit":
      return {
        title: "Disqualified",
        body: `${name} did not qualify: ${fails.map((c) => c.reason).join(" ") || lead.handoffNote} I explained this politely on the call and did not block any calendar.${
          lead.email ? ` Their email is ${lead.email} if things change.` : ""
        }`,
      };
    case "needs_review":
      return {
        title: "Needs a person",
        body: `I couldn't decide on ${name}${
          unclear.length ? ` — ${unclear.map((c) => CRITERIA[c.key].label.toLowerCase()).join(", ")} still unclear` : ""
        }. ${lead.nextStep ?? "Please follow up."}`,
      };
    case "escalation":
      return {
        title: "Escalation · existing client",
        body: `This is an existing client, not a new enquiry. ${lead.nextStep ?? "Please call them back."}`,
      };
  }
}

/** Waiting on the front desk: escalations, reviews, and qualified leads without a confirmed booking. */
export function needsAttention(lead: Lead) {
  return (
    lead.status === "needs_review" ||
    lead.status === "escalation" ||
    (lead.status === "qualified" && lead.booking?.status !== "confirmed")
  );
}
