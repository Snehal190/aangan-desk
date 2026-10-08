import { parseCallEnded, verifyWebhook } from "@/lib/integrations/vaani";
import { processCall } from "@/lib/pipeline/process-call";

export async function POST(req: Request) {
  if (!verifyWebhook(req)) return Response.json({ error: "unauthorised" }, { status: 401 });

  let call;
  try {
    call = parseCallEnded(await req.json());
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 400 });
  }

  const { lead, errors } = await processCall(call);
  return Response.json({ leadId: lead.id, status: lead.status, errors }, { status: 201 });
}
