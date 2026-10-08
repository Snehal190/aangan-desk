import type { TranscriptTurn } from "../types";
import { env } from "./env";

// Shape of the "call ended" webhook from Vaani Labs. Placeholder until the
// API docs are shared — adjust `parseCallEnded` to the real payload.
export interface CallEnded {
  callId: string;
  from: string;
  startedAt: string;
  durationSec: number;
  pickupSec: number;
  language: string;
  transcript: TranscriptTurn[];
}

export function verifyWebhook(req: Request) {
  const secret = env.vaani.webhookSecret;
  if (!secret) return false;
  return req.headers.get("x-vaani-secret") === secret; // TODO: switch to signature check if Vaani signs payloads
}

export function parseCallEnded(body: unknown): CallEnded {
  const b = body as Record<string, unknown>;
  if (!b || typeof b.callId !== "string" || !Array.isArray(b.transcript)) {
    throw new Error("Unexpected Vaani payload");
  }
  return b as unknown as CallEnded;
}
