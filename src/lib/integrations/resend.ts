import { agentDecision } from "../decision";
import { CRITERIA } from "../rubric";
import { MODE_LABEL, when } from "../format";
import type { Designer, Lead } from "../types";
import { env, NotConfiguredError } from "./env";

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);

// Designer handoff email: the short version of the report, with a link to
// the full transcript in the console.
export async function sendHandoffEmail(lead: Lead, designer: Designer) {
  if (!env.resend.apiKey) throw new NotConfiguredError("Resend");
  const b = lead.booking!;
  const url = `${env.appUrl}/desk/leads/${lead.id}`;
  const decision = agentDecision(lead);

  const html = `
  <div style="font-family:Helvetica,Arial,sans-serif;color:#292524;max-width:560px">
    <p>Hi ${esc(designer.name)},</p>
    <p>${
      b.status === "confirmed"
        ? "A consultation is on your calendar:"
        : "The caller agreed this slot on the call. It is <b>not on your calendar yet</b> (Cal.com isn't connected) — please block it:"
    } <b>${esc(when(b.start))}</b> · ${MODE_LABEL[b.mode]} · ${b.durationMin} min.</p>
    <p style="background:#E8EFE8;padding:12px 16px;border-radius:12px"><b>${esc(decision.title)}</b><br>${esc(decision.body)}</p>
    <h3 style="margin-bottom:4px">${esc(lead.callerName)} — ${esc(lead.headline)}</h3>
    <p style="margin-top:0;color:#78716C">${lead.email ? `${esc(lead.email)}${lead.emailOwner ? ` — ${esc(lead.emailOwner)}` : ""}${lead.emailConfirmed ? " (confirmed on the call)" : " (not confirmed — double-check)"}` : "No email given"}</p>
    <p>${esc(lead.handoffNote)}</p>
    <p><b>Already answered on the call — please don't re-ask:</b></p>
    <ul>${lead.alreadyAnswered.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    <p><b>Worth covering:</b></p>
    <ul>${lead.openQuestions.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    <p><b>Rubric</b><br>${lead.criteria.map((c) => `${esc(CRITERIA[c.key].label)}: ${c.verdict}`).join("<br>")}</p>
    <p><a href="${url}">Open the full report and transcript</a></p>
  </div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.resend.apiKey}` },
    body: JSON.stringify({
      from: env.resend.from,
      to: designer.email,
      subject: `${b.status === "confirmed" ? "New consultation" : "Slot to confirm"} · ${lead.callerName} · ${when(b.start)}`,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return (await res.json()) as { id: string };
}
