import { env } from "@/lib/integrations/env";
import { getSession } from "@/lib/session";
import { getLead } from "@/lib/store";

// Streams a call recording from Vaani to a signed-in team member, so the
// Vaani API key never reaches the browser.
export async function GET(req: Request, ctx: RouteContext<"/api/recording/[id]">) {
  if (!(await getSession())) return new Response("unauthorised", { status: 401 });
  const lead = await getLead((await ctx.params).id);
  if (!lead?.recordingId || !env.vaani.apiKey) return new Response("no recording", { status: 404 });

  const upstream = await fetch(`https://api.vaanivoice.ai/api/stream/${encodeURIComponent(lead.recordingId)}`, {
    headers: { "X-API-Key": env.vaani.apiKey },
  });
  if (!upstream.ok || !upstream.body) return new Response("recording not available yet", { status: 404 });

  const download = new URL(req.url).searchParams.has("download");
  const type = upstream.headers.get("content-type") ?? "audio/ogg";
  return new Response(upstream.body, {
    headers: {
      "content-type": type,
      ...(upstream.headers.get("content-length") ? { "content-length": upstream.headers.get("content-length")! } : {}),
      "cache-control": "private, max-age=3600",
      ...(download
        ? { "content-disposition": `attachment; filename="${lead.callerName.replace(/[^\w-]+/g, "_")}-${lead.id}.${type.includes("mpeg") ? "mp3" : "ogg"}"` }
        : {}),
    },
  });
}
