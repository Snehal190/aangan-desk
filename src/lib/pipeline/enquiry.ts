import { openSlots } from "../agent/agent";
import { fetchTranscript, parseTranscript } from "../integrations/vaani";
import { claimEnquiry, getEnquiry, listOpenEnquiries, saveEnquiry, saveLead } from "../store";
import type { Enquiry, Lead } from "../types";
import { processCall } from "./process-call";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Vaani can take a minute or two to finish the transcript; poll for ~2.5 min.
 *  If it's still not there, the dashboard retries later (retryStuckEnquiries). */
async function waitForTranscript(roomName: string) {
  for (let i = 0; i < 21; i++) {
    const t = await fetchTranscript(roomName).catch(() => null);
    if (t) return t;
    await sleep(i < 12 ? 5000 : 10000);
  }
  return null;
}

/** Re-try enquiries whose transcript wasn't ready (no webhook reaches localhost). */
export async function retryStuckEnquiries() {
  const open = await listOpenEnquiries();
  const stuck = open.filter((e) => e.status === "failed" || (e.status === "live" && e.endedAt));
  await Promise.all(stuck.map((e) => finishEnquiry(e.id)));
  return stuck.length;
}

/** A lead the front desk must call back — used when the call never really happened. */
export async function callbackLead(e: Enquiry, reason: string) {
  const lead: Lead = {
    id: `L-${e.id}`,
    callerName: e.name,
    email: e.email,
    language: "—",
    receivedAt: e.startedAt,
    durationSec: e.endedAt ? Math.max(0, Math.round((Date.parse(e.endedAt) - Date.parse(e.startedAt)) / 1000)) : 0,
    pickupSec: 0,
    status: "needs_review",
    headline: `Website enquiry · ${reason}`,
    project: { kind: "unknown", summary: "Not discussed", rooms: [] },
    criteria: [],
    handoffNote: `${e.name} tapped Enquire on the website, but ${reason.toLowerCase()}. Nothing about the project is known yet.`,
    alreadyAnswered: [],
    openQuestions: ["What and where is the project?"],
    flags: ["Web enquiry", "Callback needed"],
    nextStep: e.email ? `Email ${e.name} at ${e.email} to pick up the enquiry.` : `No contact details yet — ${e.name} may leave an email or call again.`,
    transcript: [],
  };
  await saveLead(lead);
  return lead;
}

/**
 * Turn a finished website call into a report. Safe to call from both the
 * Vaani webhook and the browser's hang-up: whoever claims it first does it.
 */
export async function finishEnquiry(enquiryId: string, given?: { transcript?: string; durationSec?: number }) {
  const e = await claimEnquiry(enquiryId);
  if (!e) return;
  const endedAt = e.endedAt ?? new Date().toISOString();

  try {
    const raw = given?.transcript ?? (e.roomName ? await waitForTranscript(e.roomName) : null);
    if (!raw) {
      // Give up after 30 min: the call most likely never really connected.
      if (Date.now() - Date.parse(e.startedAt) > 30 * 60_000) {
        const lead = await callbackLead({ ...e, endedAt }, "no transcript was recorded");
        await saveEnquiry({ ...e, endedAt, status: "done", leadId: lead.id });
        return;
      }
      // Leave it re-claimable: the webhook or the dashboard retry may still get it.
      await saveEnquiry({ ...e, endedAt, status: "failed", error: "Transcript not ready yet — waiting for Vaani" });
      return;
    }

    const transcript = parseTranscript(raw);
    if (!transcript.some((t) => t.speaker === "caller")) {
      const lead = await callbackLead({ ...e, endedAt }, "the call ended before they spoke");
      await saveEnquiry({ ...e, endedAt, status: "done", leadId: lead.id });
      return;
    }

    const { lead } = await processCall({
      callId: e.id,
      callerName: e.name,
      startedAt: e.startedAt,
      durationSec: given?.durationSec ?? Math.round((Date.parse(endedAt) - Date.parse(e.startedAt)) / 1000),
      pickupSec: 0,
      language: "English",
      transcript,
      offeredSlots: openSlots(new Date(e.startedAt)),
      flags: ["Web enquiry"],
    });
    await saveEnquiry({ ...e, endedAt, status: "done", leadId: lead.id, error: undefined });
  } catch (err) {
    await saveEnquiry({ ...e, endedAt, status: "failed", error: String(err).slice(0, 300) });
  }
}

export async function markEnded(enquiryId: string) {
  const e = await getEnquiry(enquiryId);
  if (e && !e.endedAt) await saveEnquiry({ ...e, endedAt: new Date().toISOString() });
  return e;
}
