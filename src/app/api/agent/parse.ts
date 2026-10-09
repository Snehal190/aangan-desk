import { openSlots } from "@/lib/agent/agent";
import type { TranscriptTurn } from "@/lib/types";

// Validates the test-call body: { transcript, startedAt }. Open slots are
// derived from the call start on the server, never taken from the client.
export function parseTestCall(body: unknown) {
  const b = body as { transcript?: unknown; startedAt?: unknown } | null;
  if (!b || !Array.isArray(b.transcript) || typeof b.startedAt !== "string") return null;
  if (b.transcript.length > 80) return null;
  const transcript = b.transcript.filter(
    (t): t is TranscriptTurn =>
      !!t &&
      (t.speaker === "agent" || t.speaker === "caller") &&
      typeof t.text === "string" &&
      t.text.length <= 2000 &&
      typeof t.at === "string",
  );
  if (transcript.length !== b.transcript.length) return null;
  if (Number.isNaN(Date.parse(b.startedAt))) return null;
  return { transcript, slots: openSlots(new Date(b.startedAt)), startedAt: b.startedAt };
}
