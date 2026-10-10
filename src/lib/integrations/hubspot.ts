import { getDesigner } from "../designers";
import { MODE_LABEL, when } from "../format";
import { CRITERIA } from "../rubric";
import type { Lead } from "../types";
import { env, NotConfiguredError } from "./env";

// Founder's view in HubSpot. Every call becomes (or updates) a contact whose
// Lead status reflects the verdict, with the report attached as a note.
// Deals: if the key may create pipelines, every call gets a deal in a
// dedicated "Aangan enquiries" pipeline. Otherwise (free CRM / no schema
// scope) only qualified calls get a deal, in the default pipeline's
// "Appointment Scheduled" stage.
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

type DealTarget =
  | { mode: "dedicated"; pipelineId: string; stage: (label: (typeof STAGES)[number]) => string }
  | { mode: "default"; pipelineId: string; bookedStage: string };

let target: DealTarget | undefined;

/** Our own pipeline if it exists or can be created; else the default one. */
async function dealTarget(): Promise<DealTarget> {
  if (target) return target;
  try {
    const p = await ensurePipeline();
    target = { mode: "dedicated", ...p };
  } catch (err) {
    if (!String(err).includes("→ 403")) throw err;
    const { results } = await hs<{ results: Pipeline[] }>("GET", "/crm/v3/pipelines/deals");
    const def = results.find((x) => x.id === "default") ?? results[0];
    const booked = def.stages.find((st) => st.id === "appointmentscheduled") ?? def.stages[0];
    target = { mode: "default", pipelineId: def.id, bookedStage: booked.id };
  }
  return target;
}

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
  const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);
  const [firstname, ...rest] = lead.callerName.trim().split(/\s+/).map(cap);
  const properties: Record<string, string> = {
    firstname,
    lastname: rest.join(" "),
    hs_lead_status: { qualified: "OPEN_DEAL", not_fit: "UNQUALIFIED", needs_review: "IN_PROGRESS", escalation: "IN_PROGRESS" }[lead.status],
  };
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

export async function syncLeadToHubSpot(lead: Lead): Promise<{ dealId?: string; contactId: string }> {
  const t = await dealTarget();
  const contactId = await upsertContact(lead);

  let dealstage: string | undefined;
  if (t.mode === "dedicated") {
    dealstage =
      lead.status === "qualified"
        ? t.stage("Qualified – consultation booked")
        : lead.status === "not_fit"
          ? t.stage("Disqualified")
          : t.stage("Needs review");
  } else if (lead.status === "qualified") {
    dealstage = t.bookedStage;
  }

  let dealId = lead.hubspotDealId;
  if (dealstage) {
    const properties = {
      dealname: `${lead.callerName.replace(/(^|\s)(\p{Ll})/gu, (_, sp: string, c: string) => sp + c.toUpperCase())} — ${lead.headline}`.slice(0, 200),
      pipeline: t.pipelineId,
      dealstage,
      description: lead.handoffNote.slice(0, 5000),
      ...(lead.booking ? { closedate: new Date(lead.booking.start).toISOString() } : {}),
    };
    dealId = dealId
      ? (await hs<{ id: string }>("PATCH", `/crm/v3/objects/deals/${dealId}`, { properties })).id
      : (await hs<{ id: string }>("POST", "/crm/v3/objects/deals", { properties })).id;
    await hs("PUT", `/crm/v4/objects/deals/${dealId}/associations/default/contacts/${contactId}`);
  }

  await hs("POST", "/crm/v3/objects/notes", {
    properties: { hs_timestamp: new Date().toISOString(), hs_note_body: noteHtml(lead) },
    associations: [
      { to: { id: contactId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }] },
      ...(dealId ? [{ to: { id: dealId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 214 }] }] : []),
    ],
  });
  return { dealId, contactId };
}
