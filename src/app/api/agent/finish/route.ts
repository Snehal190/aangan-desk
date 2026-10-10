import { processCall } from "@/lib/pipeline/process-call";
import { getSession } from "@/lib/session";
import { parseTestCall } from "../parse";

// Ends a test call: runs the same pipeline a real Vaani call goes through.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorised" }, { status: 401 });
  const body = await parseTestCall(await req.json().catch(() => null));
  if (!body || body.transcript.length < 2) return Response.json({ error: "bad request" }, { status: 400 });

  const durationSec = Math.max(1, Math.round((Date.now() - Date.parse(body.startedAt)) / 1000));
  try {
    const { lead, errors } = await processCall({
      callId: `TEST-${Date.now().toString(36).toUpperCase()}`,
      from: `Test call by ${session.name}`,
      startedAt: body.startedAt,
      durationSec,
      pickupSec: 0,
      language: "English",
      transcript: body.transcript,
      offeredSlots: body.slots,
      flags: ["Test call"],
    });
    return Response.json({ leadId: lead.id, status: lead.status, errors });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
