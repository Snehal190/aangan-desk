"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { TranscriptTurn } from "@/lib/types";

type Phase = "idle" | "live" | "thinking" | "finishing" | "error";

const elapsed = (start: number) => {
  const s = Math.floor((Date.now() - start) / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
};

const SAMPLE_OPENERS = [
  "Hi, we have a 3BHK in Baner and want to redo the whole flat.",
  "Can someone come and suggest colours for my living room?",
  "How much do you charge per square foot?",
];

export function TestCall({ greeting }: { greeting: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const startedAt = useRef<{ iso: string; ms: number }>({ iso: "", ms: 0 });
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns, phase]);

  function start() {
    const now = new Date();
    startedAt.current = { iso: now.toISOString(), ms: now.getTime() };
    setTurns([{ speaker: "agent", at: "0:00", text: greeting }]);
    setPhase("live");
    setTimeout(() => input.current?.focus(), 50);
  }

  async function finish(transcript: TranscriptTurn[]) {
    setPhase("finishing");
    const res = await fetch("/api/agent/finish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transcript, startedAt: startedAt.current.iso }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.leadId) {
      setError(data.error ?? "Couldn't write the report.");
      setPhase("error");
      return;
    }
    router.push(`/leads/${data.leadId}`);
  }

  async function send(text: string) {
    const said = text.trim();
    if (!said || phase !== "live") return;
    const next = [...turns, { speaker: "caller" as const, at: elapsed(startedAt.current.ms), text: said }];
    setTurns(next);
    setDraft("");
    setPhase("thinking");

    const res = await fetch("/api/agent/reply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transcript: next, startedAt: startedAt.current.iso }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data.text !== "string") {
      setError(data.error ?? "The agent didn't answer.");
      setPhase("error");
      return;
    }
    const withReply = [...next, { speaker: "agent" as const, at: elapsed(startedAt.current.ms), text: data.text }];
    setTurns(withReply);
    if (data.ended) await finish(withReply);
    else {
      setPhase("live");
      input.current?.focus();
    }
  }

  if (phase === "idle") {
    return (
      <div className="flex justify-center">
        <button
          onClick={start}
          className="animate-breathe grid size-40 place-items-center rounded-full bg-coral text-xl font-medium text-ink shadow-coral transition-transform duration-500 hover:scale-[1.03]"
        >
          Call Aangan
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl rounded-[3rem] bg-white p-4 shadow-soft sm:p-6">
      <div className="flex items-center justify-between px-2 pb-4">
        <span className="flex items-center gap-2 text-sm text-muted">
          <span className={`size-2 rounded-full ${phase === "finishing" || phase === "error" ? "bg-stone-300" : "animate-pulse bg-sage-deep"}`} />
          {phase === "finishing" ? "Call ended" : "On call · Aangan Studio"}
        </span>
        {(phase === "live" || phase === "thinking") && (
          <button
            onClick={() => finish(turns)}
            disabled={phase === "thinking" || turns.length < 2}
            className="rounded-full bg-blush px-4 py-1.5 text-sm font-medium text-coral-deep disabled:opacity-50"
          >
            End call
          </button>
        )}
      </div>

      <ol className="max-h-[55vh] space-y-3 overflow-y-auto px-1">
        {turns.map((t, i) => (
          <li key={i} className={`flex ${t.speaker === "caller" ? "justify-end" : ""}`}>
            <div
              className={`max-w-[85%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed ${
                t.speaker === "caller" ? "bg-ink text-cream" : "bg-stone-50 text-stone-700"
              }`}
            >
              <span className={`mb-0.5 block text-xs ${t.speaker === "caller" ? "text-stone-400" : "text-stone-400"}`}>
                {t.speaker === "caller" ? "You" : "Agent"} · {t.at}
              </span>
              {t.text}
            </div>
          </li>
        ))}
        {phase === "thinking" && <li className="px-4 text-sm text-stone-400">Agent is answering…</li>}
        {phase === "finishing" && (
          <li className="rounded-3xl bg-sage px-4 py-3 text-[15px] text-sage-deep">
            Writing the report — checking the rubric, the booking and the handoff note…
          </li>
        )}
        {phase === "error" && <li className="rounded-3xl bg-blush px-4 py-3 text-[15px] text-coral-deep">{error}</li>}
        <div ref={bottom} />
      </ol>

      {turns.length === 1 && phase === "live" && (
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
          {SAMPLE_OPENERS.map((s) => (
            <button key={s} onClick={() => send(s)} className="shrink-0 rounded-full border border-stone-200 px-3 py-1.5 text-sm text-muted hover:text-ink">
              {s}
            </button>
          ))}
        </div>
      )}

      {(phase === "live" || phase === "thinking") && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="mt-4 flex items-end gap-2"
        >
          <textarea
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            rows={1}
            placeholder="Say something as the caller…"
            className="max-h-32 min-h-12 flex-1 resize-none rounded-3xl border border-stone-200 bg-stone-50 px-5 py-3 outline-none focus:border-coral"
          />
          <button
            disabled={phase !== "live" || !draft.trim()}
            className="h-12 rounded-full bg-ink px-5 font-medium text-cream transition-transform duration-500 hover:scale-105 disabled:opacity-40"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
