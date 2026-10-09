import type { Booking, Designer } from "../types";
import { env, NotConfiguredError } from "./env";

// Cal.com v2 bookings API — blocks the slot on the designer's calendar.
export async function bookConsultation(args: {
  designer: Designer;
  start: string;
  mode: Booking["mode"];
  attendee: { name: string; email?: string; phone?: string };
  leadId: string;
}): Promise<{ uid: string }> {
  if (!env.cal.apiKey) throw new NotConfiguredError("Cal.com");

  const res = await fetch("https://api.cal.com/v2/bookings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.cal.apiKey}`,
      "cal-api-version": "2024-08-13",
    },
    body: JSON.stringify({
      start: new Date(args.start).toISOString(),
      eventTypeSlug: env.cal.eventSlug,
      username: args.designer.calUsername,
      attendee: {
        name: args.attendee.name,
        // The caller's confirmed email gets the invite; without one it goes
        // to the designer so the slot is still blocked.
        email: args.attendee.email ?? args.designer.email,
        ...(args.attendee.phone ? { phoneNumber: args.attendee.phone } : {}),
        timeZone: "Asia/Kolkata",
      },
      metadata: { leadId: args.leadId, mode: args.mode },
    }),
  });
  if (!res.ok) throw new Error(`Cal.com ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { uid: data.data.uid };
}
