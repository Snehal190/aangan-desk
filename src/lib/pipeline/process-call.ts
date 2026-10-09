import { DESIGNERS, getDesigner } from "../designers";
import { bookConsultation } from "../integrations/cal";
import { env } from "../integrations/env";
import { analyseCall } from "../integrations/gemini";
import { syncLeadToHubSpot } from "../integrations/hubspot";
import { sendHandoffEmail } from "../integrations/resend";
import type { CallEnded } from "../integrations/vaani";
import { saveLead } from "../store";
import type { Booking, Lead } from "../types";

// Call ended → analyse → book → save → email designer → sync HubSpot.
// Every step after analysis is best-effort: the lead is saved first so it is
// on the dashboard even if email, calendar or HubSpot fail.
export async function processCall(
  call: CallEnded & { booking?: Booking; offeredSlots?: string[]; flags?: string[] },
) {
  const { bookedSlot, bookingMode, language, ...analysis } = await analyseCall(call.transcript, {
    offeredSlots: call.offeredSlots,
  });

  // A slot only counts if the agent could actually have offered it.
  const slotOk = !!bookedSlot && !Number.isNaN(Date.parse(bookedSlot)) && (!call.offeredSlots || call.offeredSlots.includes(bookedSlot));
  let booking: Booking | undefined = call.booking;
  if (!booking && analysis.status === "qualified" && slotOk) {
    booking = { designerId: DESIGNERS[0].id, start: bookedSlot!, durationMin: 60, mode: bookingMode ?? "studio", status: "held" };
  }

  const lead: Lead = {
    ...analysis,
    id: `L-${call.callId}`,
    phone: call.from,
    language: language || call.language,
    receivedAt: call.startedAt,
    durationSec: call.durationSec,
    pickupSec: call.pickupSec,
    transcript: call.transcript,
    flags: [...(call.flags ?? []), ...analysis.flags],
    booking: analysis.status === "qualified" ? booking : undefined,
  };
  await saveLead(lead);

  const errors: string[] = [];
  const designer = getDesigner(lead.booking?.designerId);

  if (lead.booking?.status === "held" && designer && env.cal.apiKey) {
    try {
      const { uid } = await bookConsultation({
        designer,
        start: lead.booking.start,
        mode: lead.booking.mode,
        attendee: { name: lead.callerName, phone: lead.phone },
        leadId: lead.id,
      });
      lead.booking = { ...lead.booking, status: "confirmed", calBookingUid: uid };
    } catch (e) {
      errors.push(String(e));
    }
  }

  if (lead.booking && designer) {
    try {
      await sendHandoffEmail(lead, designer);
      lead.booking.emailSentAt = new Date().toISOString();
    } catch (e) {
      errors.push(String(e));
    }
  }

  if (env.hubspot.token) {
    try {
      lead.hubspotDealId = (await syncLeadToHubSpot(lead)).dealId;
    } catch (e) {
      errors.push(String(e));
    }
  }

  await saveLead(lead);
  return { lead, errors };
}
