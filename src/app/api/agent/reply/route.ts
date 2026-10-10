import { agentReply } from "@/lib/agent/agent";
import { getSession } from "@/lib/session";
import { parseTestCall } from "../parse";

export async function POST(req: Request) {
  if (!(await getSession())) return Response.json({ error: "unauthorised" }, { status: 401 });
  const body = await parseTestCall(await req.json().catch(() => null));
  if (!body) return Response.json({ error: "bad request" }, { status: 400 });

  try {
    return Response.json(await agentReply(body.transcript, body.slots));
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }
}
