import { randomUUID } from "node:crypto";
import { openSlots, systemPrompt, webGreeting } from "@/lib/agent/agent";
import { startWebCall } from "@/lib/integrations/vaani";
import { callbackLead } from "@/lib/pipeline/enquiry";
import { saveEnquiry } from "@/lib/store";
import type { Enquiry } from "@/lib/types";

// Public: the website's "Enquire" button. Each call costs money, so inputs are
// checked and starts are rate-limited per IP (best-effort on serverless).
const recent = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.set(ip, [...hits, now]);
  return hits.length >= 3;
}

/** Indian mobile: 10 digits starting 6–9, optional +91 / 0 prefix. */
function normalisePhone(raw: string) {
  const digits = raw.replace(/[^\d]/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : null;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { name?: unknown; phone?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ").slice(0, 60) : "";
  const phone = typeof body?.phone === "string" ? normalisePhone(body.phone) : null;
  if (name.length < 2) return Response.json({ error: "Please tell us your name." }, { status: 400 });
  if (!phone) return Response.json({ error: "Please enter a 10-digit mobile number." }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return Response.json({ error: "Too many calls in a short time — please try again in a few minutes." }, { status: 429 });

  const startedAt = new Date().toISOString();
  const enquiry: Enquiry = { id: `ENQ-${randomUUID().slice(0, 8).toUpperCase()}`, name, phone, startedAt, status: "live" };

  try {
    const call = await startWebCall({
      enquiryId: enquiry.id,
      callerName: name,
      systemPrompt: await systemPrompt(openSlots(new Date(startedAt)), { channel: "vaani", callerName: name }),
      welcomeMessage: webGreeting(name),
    });
    await saveEnquiry({ ...enquiry, roomName: call.roomName });
    return Response.json({ enquiryId: enquiry.id, ...call });
  } catch (err) {
    // Never lose the lead: the front desk gets a callback task instead.
    console.error("enquiry start failed", err);
    await saveEnquiry({ ...enquiry, status: "done", error: String(err).slice(0, 300), leadId: `L-${enquiry.id}` });
    await callbackLead(enquiry, "the call couldn't connect");
    return Response.json({ enquiryId: enquiry.id, fallback: true });
  }
}
