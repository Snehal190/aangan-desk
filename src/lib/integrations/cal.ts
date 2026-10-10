import { MODE_LABEL } from "../format";
import type { Booking, Designer } from "../types";
import { env, NotConfiguredError } from "./env";

// Cal.com v2 — reads the designer's real free slots (their connected Google
// Calendar is respected) and books the consultation onto it.
const API = "https://api.cal.com/v2";
const headers = (version: string) => ({
  authorization: `Bearer ${env.cal.apiKey}`,
  "content-type": "application/json",
  "cal-api-version": version,
});

/** Free consultation start times (ISO, IST) between `from` and `days` later. */
export async function freeSlots(from: Date, days = 7): Promise<string[]> {
  if (!env.cal.apiKey || !env.cal.eventTypeId) throw new NotConfiguredError("Cal.com");
  const end = new Date(from.getTime() + days * 86_400_000);
  const url = `${API}/slots?eventTypeId=${env.cal.eventTypeId}&start=${from.toISOString()}&end=${end.toISOString()}&timeZone=Asia/Kolkata`;
  const res = await fetch(url, { headers: headers("2024-09-04"), cache: "no-store" });
  if (!res.ok) throw new Error(`Cal.com slots ${res.status}: ${await res.text()}`);
  const data = (await res.json()).data as Record<string, { start: string }[]>;
  // Cal returns "2026-10-12T09:00:00.000+05:30"; drop the millis so the
  // value matches what the agent and analysis echo back.
  return Object.values(data)
    .flat()
    .map((s) => s.start.replace(".000", ""));
}

export async function bookConsultation(args: {
  designer: Designer;
  start: string;
  mode: Booking["mode"];
  attendee: { name: string; email?: string; phone?: string };
  leadId: string;
}): Promise<{ uid: string }> {
  if (!env.cal.apiKey || !env.cal.eventTypeId) throw new NotConfiguredError("Cal.com");

  const res = await fetch(`${API}/bookings`, {
    method: "POST",
    headers: headers("2024-08-13"),
    body: JSON.stringify({
      start: new Date(args.start).toISOString(),
      eventTypeId: Number(env.cal.eventTypeId),
      attendee: {
        name: args.attendee.name,
        // The caller's confirmed email gets the invite; without one it goes
        // to the designer so the slot is still blocked.
        email: args.attendee.email ?? args.designer.email,
        ...(args.attendee.phone ? { phoneNumber: args.attendee.phone } : {}),
        timeZone: "Asia/Kolkata",
        language: "en",
      },
      bookingFieldsResponses: {
        notes: `${MODE_LABEL[args.mode]} — booked by the Aangan assistant. Report: ${env.appUrl}/desk/leads/${args.leadId}`,
      },
      metadata: { leadId: args.leadId, mode: args.mode },
    }),
  });
  if (!res.ok) throw new Error(`Cal.com ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { uid: data.data.uid };
}
