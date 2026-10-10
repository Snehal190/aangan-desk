import { after } from "next/server";
import { finishEnquiry, markEnded } from "@/lib/pipeline/enquiry";

// Public: the browser tells us the visitor hung up. The report is written
// after the response — Vaani's webhook may get there first, which is fine.
// Writing a report waits for Vaani's transcript, then Gemini, Cal.com,
// email and HubSpot — allow up to 5 minutes in after().
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { enquiryId?: unknown } | null;
  const id = typeof body?.enquiryId === "string" ? body.enquiryId : "";
  if (!/^ENQ-[0-9A-F]{8}$/.test(id)) return Response.json({ error: "bad request" }, { status: 400 });

  const e = await markEnded(id);
  if (!e) return Response.json({ error: "not found" }, { status: 404 });
  after(() => finishEnquiry(id));
  return Response.json({ ok: true });
}
