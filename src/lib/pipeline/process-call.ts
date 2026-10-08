import { getDesigner } from "../designers";
import { analyseCall } from "../integrations/gemini";
import { syncLeadToHubSpot } from "../integrations/hubspot";
import { sendHandoffEmail } from "../integrations/resend";
import type { CallEnded } from "../integrations/vaani";
import { saveLead } from "../store";
import type { Booking, Lead } from "../types";

// Call ended → analyse → save → email designer → sync HubSpot.
// Booking itself happens during the call (the agent offers a slot via Cal.com
// and passes the result through on the webhook as `booking`).
export async function processCall(call: CallEnded & { booking?: Booking }) {
  const analysis = await analyseCall(call.transcript);

  const lead: Lead = {
    id: `L-${call.callId}`,
    phone: call.from,
    language: call.language,
    receivedAt: call.startedAt,
    durationSec: call.durationSec,
    pickupSec: call.pickupSec,
    transcript: call.transcript,
    booking: analysis.status === "qualified" ? call.booking : undefined,
    ...analysis,
  };
  await saveLead(lead);

  const errors: string[] = [];
  const designer = getDesigner(lead.booking?.designerId);
  if (lead.booking && designer) {
    try {
      await sendHandoffEmail(lead, designer);
      lead.booking.emailSentAt = new Date().toISOString();
    } catch (e) {
      errors.push(String(e));
    }
  }
  try {
    lead.hubspotDealId = (await syncLeadToHubSpot(lead)).dealId;
  } catch (e) {
    errors.push(String(e));
  }
  await saveLead(lead);
  return { lead, errors };
}
