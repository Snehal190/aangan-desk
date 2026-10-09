import { after } from "next/server";
import { parseWebhook, verifyWebhook } from "@/lib/integrations/vaani";
import { finishEnquiry, markEnded } from "@/lib/pipeline/enquiry";
import { findEnquiryByRoom } from "@/lib/store";

// Vaani AI call events. Configure in Vaani → Settings → Webhooks as
//   <APP_URL>/api/webhooks/vaani?key=<VAANI_WEBHOOK_SECRET>
export async function POST(req: Request) {
  if (!verifyWebhook(req)) return Response.json({ error: "unauthorised" }, { status: 401 });
  const ev = parseWebhook(await req.json().catch(() => null));

  const room = ev.roomName ?? ev.callId;
  const enquiry = room ? await findEnquiryByRoom(room) : undefined;
  if (!enquiry) return Response.json({ ok: true, ignored: "unknown call" });

  if (ev.event === "call_ended") {
    await markEnded(enquiry.id);
    after(() => finishEnquiry(enquiry.id));
  }
  if (ev.event === "call_postprocessing" && ev.transcript) {
    after(() => finishEnquiry(enquiry.id, { transcript: ev.transcript, durationSec: ev.durationSec }));
  }
  return Response.json({ ok: true });
}
