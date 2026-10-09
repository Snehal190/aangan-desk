import type { TranscriptTurn } from "../types";
import { env, NotConfiguredError } from "./env";

// Vaani AI (api.vaanivoice.ai). We start in-browser WebRTC calls with our own
// system prompt, and read the transcript after the call — from the
// `call_postprocessing` webhook, or by fetching it if the webhook is late.
const API = "https://api.vaanivoice.ai";

export interface WebCall {
  token: string;
  roomName: string;
  connectionUrl: string;
  liveCaptionsUrl?: string;
}

export async function startWebCall(args: {
  enquiryId: string;
  callerName: string;
  systemPrompt: string;
  welcomeMessage: string;
}): Promise<WebCall> {
  const { apiKey, agentId } = env.vaani;
  if (!apiKey || !agentId) throw new NotConfiguredError("Vaani");

  const res = await fetch(`${API}/api/trigger-call/`, {
    method: "POST",
    headers: { "content-type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({
      agent_id: agentId,
      medium: "webrtc",
      primary_language: "en",
      secondary_language: "hi",
      voice_gender: env.vaani.voiceGender,
      welcome_message: args.welcomeMessage,
      welcome_interruptible: true,
      metadata: { enquiry_id: args.enquiryId, caller_name: args.callerName },
      modify_agent: {
        persona: { identity: { system_prompt: args.systemPrompt } },
        experience: { settings: { call_settings: { max_call_duration: 12 } } },
      },
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Vaani ${res.status}: ${text.slice(0, 300)}`);
  const d = JSON.parse(text);
  if (!d.token || !d.connection_url || !d.room_name) throw new Error(`Vaani: unexpected response ${text.slice(0, 200)}`);
  return { token: d.token, roomName: d.room_name, connectionUrl: d.connection_url, liveCaptionsUrl: d.live_captions_url };
}

/** Transcript text, or null if Vaani hasn't finished processing yet. */
export async function fetchTranscript(callId: string): Promise<string | null> {
  if (!env.vaani.apiKey) throw new NotConfiguredError("Vaani");
  const res = await fetch(`${API}/api/transcript/${encodeURIComponent(callId)}`, {
    headers: { "X-API-Key": env.vaani.apiKey },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Vaani transcript ${res.status}`);
  const d = await res.json();
  if (d.status_code === 404 || typeof d.transcript !== "string" || /not found/i.test(d.transcript)) return null;
  return d.transcript;
}

/** "[13:33:14] AGENT: Hi…\n\n[13:33:19] USER: …" (timestamps optional) → turns. */
export function parseTranscript(raw: string): TranscriptTurn[] {
  const turns: TranscriptTurn[] = [];
  let t0: number | undefined;
  for (const block of raw.split(/\n\s*\n/)) {
    const m = block.trim().match(/^(?:\[(\d{1,2}):(\d{2}):(\d{2})\]\s*)?(AGENT|USER|ASSISTANT|BOT|CUSTOMER)\s*:\s*([\s\S]*)$/i);
    if (!m) {
      if (turns.length && block.trim()) turns[turns.length - 1].text += ` ${block.trim()}`;
      continue;
    }
    const [, h, mi, s, who, text] = m;
    let at = "";
    if (h) {
      const secs = Number(h) * 3600 + Number(mi) * 60 + Number(s);
      t0 ??= secs;
      const d = Math.max(0, secs - t0);
      at = `${Math.floor(d / 60)}:${(d % 60).toString().padStart(2, "0")}`;
    }
    const speaker = /^(AGENT|ASSISTANT|BOT)$/i.test(who) ? "agent" : "caller";
    if (text.trim()) turns.push({ speaker, at, text: text.trim() });
  }
  return turns;
}

/** Vaani doesn't sign webhooks, so the URL carries a secret: /api/webhooks/vaani?key=… */
export function verifyWebhook(req: Request) {
  const secret = env.vaani.webhookSecret;
  if (!secret) return false;
  const given = new URL(req.url).searchParams.get("key") ?? req.headers.get("x-vaani-secret");
  return given === secret;
}

export interface VaaniEvent {
  event: string;
  roomName?: string;
  callId?: string;
  transcript?: string;
  durationSec?: number;
  summary?: string;
}

export function parseWebhook(body: unknown): VaaniEvent {
  const b = (body ?? {}) as Record<string, unknown>;
  const data = (b.data ?? b) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const event = str(b.event) ?? "";
  const rawDuration = typeof data.call_duration === "number" ? data.call_duration : undefined;
  return {
    event,
    roomName: str(data.room_name) ?? str(b.room_name),
    callId: str(data.call_id) ?? str(b.call_id),
    transcript: str(data.transcript),
    // call_ended reports seconds, call_postprocessing milliseconds.
    durationSec: rawDuration === undefined ? undefined : Math.round(event === "call_postprocessing" ? rawDuration / 1000 : rawDuration),
    summary: str(data.summary),
  };
}
