import { getDesigner } from "../designers";
import { MODE_LABEL, when } from "../format";
import { CRITERIA } from "../rubric";
import type { Lead } from "../types";
import { env, NotConfiguredError } from "./env";

// Founder's view in HubSpot: every call becomes a contact + a deal in the
// "Aangan enquiries" pipeline, with the report attached as a note.
//
// Auth: a service key / private-app token (HUBSPOT_TOKEN) used as a Bearer
// token; otherwise a personal access key exchanged for a short-lived token
// (read-only in practice). Writes need the contacts + deals write scopes.
const API = "https://api.hubapi.com";
const PIPELINE_LABEL = "Aangan enquiries";
const STAGES = [
  "Qualified – consultation booked",
  "Needs review",
  "Disqualified",
  "Consultation done",
  "Won",
  "Lost",
] as const;

let cached: { token: string; expires: number } | undefined;

async function token() {
  if (env.hubspot.token) return env.hubspot.token;
  if (!env.hubspot.personalAccessKey) throw new NotConfiguredError("HubSpot");
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const res = await fetch(`${API}/localdevauth/v1/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ encodedOAuthRefreshToken: env.hubspot.personalAccessKey }),
  });
  if (!res.ok) throw new Error(`HubSpot auth ${res.status}: ${await res.text()}`);
  const d = await res.json();
  cached = { token: d.oauthAccessToken, expires: d.expiresAtMillis };
  return cached.token;
}

async function hs<T = Record<string, unknown>>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { authorization: `Bearer ${await token()}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HubSpot ${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

type Pipeline = { id: string; label: string; stages: { id: string; label: string }[] };

/** Finds (or creates) the Aangan pipeline and returns stage ids by label. */
export async function ensurePipeline() {
  const { results } = await hs<{ results: Pipeline[] }>("GET", "/crm/v3/pipelines/deals");
  let p = results.find((x) => x.id === env.hubspot.pipelineId || x.label === PIPELINE_LABEL);
  if (!p) {
    p = await hs<Pipeline>("POST", "/crm/v3/pipelines/deals", {
      label: PIPELINE_LABEL,
      displayOrder: 0,
      stages: STAGES.map((label, i) => ({
        label,
        displayOrder: i,
        metadata: { probability: label === "Won" ? "1.0" : label === "Lost" || label === "Disqualified" ? "0.0" : "0.5" },
      })),
    });
  }
  const stage = (label: (typeof STAGES)[number]) => p!.stages.find((s) => s.label === label)?.id ?? p!.stages[0].id;
  return { pipelineId: p.id, stage };
}

async function upsertContact(lead: Lead) {
  const [firstname, ...rest] = lead.callerName.trim().split(/\s+/);
  const properties: Record<string, string> = { firstname, lastname: rest.join(" "), lifecyclestage: "lead" };
  if (lead.email) properties.email = lead.email;
  if (lead.phone) properties.phone = lead.phone;

  if (lead.email) {
    const found = await hs<{ results: { id: string }[] }>("POST", "/crm/v3/objects/contacts/search", {
      filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: lead.email }] }],
      limit: 1,
    });
    if (found.results[0]) {
      await hs("PATCH", `/crm/v3/objects/contacts/${found.results[0].id}`, { properties });
      return found.results[0].id;
    }
  }
  return (await hs<{ id: string }>("POST", "/crm/v3/objects/contacts", { properties })).id;
}

function noteHtml(lead: Lead) {
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  const b = lead.booking;
  const designer = getDesigner(b?.designerId);
  return [
    `<p><b>${esc(lead.headline)}</b></p>`,
    `<p>${esc(lead.handoffNote)}</p>`,
    b && designer ? `<p><b>Consultation:</b> ${esc(when(b.start))} · ${MODE_LABEL[b.mode]} · ${esc(designer.name)} (${b.status === "confirmed" ? "on calendar" : "not yet on calendar"})</p>` : "",
    lead.email ? `<p><b>Email:</b> ${esc(lead.email)}${lead.emailOwner ? ` (${esc(lead.emailOwner)})` : ""}</p>` : "",
    `<p><b>Rubric:</b><br>${lead.criteria.map((c) => `${esc(CRITERIA[c.key].label)}: ${c.verdict} — ${esc(c.reason)}`).join("<br>")}</p>`,
    `<p><a href="${env.appUrl}/desk/leads/${lead.id}">Full report and transcript</a></p>`,
  ].join("");
}

export async function syncLeadToHubSpot(lead: Lead): Promise<{ dealId: string }> {
  const { pipelineId, stage } = await ensurePipeline();
  const contactId = await upsertContact(lead);

  const dealstage =
    lead.status === "qualified"
      ? stage("Qualified – consultation booked")
      : lead.status === "not_fit"
        ? stage("Disqualified")
        : stage("Needs review");
  const properties = {
    dealname: `${lead.callerName} — ${lead.headline}`.slice(0, 200),
    pipeline: pipelineId,
    dealstage,
    description: lead.handoffNote.slice(0, 5000),
    ...(lead.booking ? { closedate: new Date(lead.booking.start).toISOString() } : {}),
  };

  const dealId = lead.hubspotDealId
    ? (await hs<{ id: string }>("PATCH", `/crm/v3/objects/deals/${lead.hubspotDealId}`, { properties })).id
    : (await hs<{ id: string }>("POST", "/crm/v3/objects/deals", { properties })).id;

  await hs("PUT", `/crm/v4/objects/deals/${dealId}/associations/default/contacts/${contactId}`);
  await hs("POST", "/crm/v3/objects/notes", {
    properties: { hs_timestamp: new Date().toISOString(), hs_note_body: noteHtml(lead) },
    associations: [
      { to: { id: dealId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 214 }] },
      { to: { id: contactId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }] },
    ],
  });
  return { dealId };
}
