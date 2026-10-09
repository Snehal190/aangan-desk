"use client";

import {
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RemoteTrack,
  type TranscriptionSegment,
} from "livekit-client";
import { useEffect, useRef, useState } from "react";

type Phase = "form" | "connecting" | "live" | "ended" | "fallback";
type Line = { id: string; who: "agent" | "you"; text: string };

const clock = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

/** Website "Enquire" call: name + mobile → in-browser voice call with the Vaani agent. */
export function EnquireCall() {
  const [phase, setPhase] = useState<Phase>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);
  const [error, setError] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [muted, setMuted] = useState(false);
  const [agentTalking, setAgentTalking] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const room = useRef<Room | null>(null);
  const enquiryId = useRef("");
  const audioBox = useRef<HTMLDivElement>(null);
  const ended = useRef(false);
  const streaming = useRef("");

  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // If the visitor closes the tab mid-call, still tell the studio it ended.
  useEffect(() => {
    const onHide = () => {
      if (enquiryId.current && !ended.current && room.current) {
        navigator.sendBeacon("/api/enquiry/end", new Blob([JSON.stringify({ enquiryId: enquiryId.current })], { type: "application/json" }));
      }
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, []);

  function upsertLine(line: Line) {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.id === line.id);
      if (i === -1) return [...prev, line].slice(-8);
      const next = [...prev];
      next[i] = line;
      return next;
    });
  }

  async function finish() {
    if (ended.current) return;
    ended.current = true;
    room.current?.disconnect();
    setPhase("ended");
    if (enquiryId.current) {
      await fetch("/api/enquiry/end", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enquiryId: enquiryId.current }),
        keepalive: true,
      }).catch(() => {});
    }
  }

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    ended.current = false;
    setLines([]);
    setSeconds(0);

    let mic: MediaStream;
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      mic.getTracks().forEach((t) => t.stop()); // LiveKit opens its own; this just asks permission early
    } catch {
      setError("We need your microphone for the call. Please allow it in your browser and try again.");
      return;
    }

    setPhase("connecting");
    const res = await fetch("/api/enquiry/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setPhase("form");
      return;
    }
    enquiryId.current = data.enquiryId;
    if (data.fallback) {
      setPhase("fallback");
      return;
    }

    // Mirrors Vaani's own web client (livekit-client 2.17.2, adaptiveStream +
    // dynacast, mic enabled once the room reports Connected).
    const r = new Room({ adaptiveStream: true, dynacast: true });
    room.current = r;
    r.on(RoomEvent.Connected, async () => {
      setPhase("live");
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await r.localParticipant.setMicrophoneEnabled(true);
          return;
        } catch (err) {
          console.warn("Mic publish failed, retrying", err);
        }
      }
      setError("Your microphone couldn't connect to the call. Please end the call and try again.");
    });
    r.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Audio) audioBox.current?.appendChild(track.attach());
      r.startAudio().catch(() => {});
    });
    r.on(RoomEvent.TranscriptionReceived, (segments: TranscriptionSegment[], p?: Participant) => {
      const who = p?.identity === r.localParticipant.identity ? "you" : "agent";
      for (const s of segments) if (s.text.trim()) upsertLine({ id: s.id, who, text: s.text });
    });
    // Vaani streams captions as JSON data messages.
    r.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
      try {
        const m = JSON.parse(new TextDecoder().decode(payload)) as { type?: string; text?: string; content?: string };
        const text = (m.text ?? m.content ?? "").trim();
        if (m.type === "stt_transcript" || m.type === "stt_final") {
          if (text) upsertLine({ id: `u-${Date.now()}`, who: "you", text });
        } else if (m.type === "tts_transcript" || m.type === "text") {
          streaming.current = "";
          if (text) upsertLine({ id: `a-${Date.now()}`, who: "agent", text });
        } else if (m.type === "text_chunk") {
          const chunk = m.content ?? m.text ?? "";
          if (!streaming.current) streaming.current = `a-${Date.now()}`;
          const id = streaming.current;
          setLines((prev) => {
            const last = prev.find((l) => l.id === id);
            return last ? prev.map((l) => (l.id === id ? { ...l, text: l.text + chunk } : l)) : [...prev, { id, who: "agent" as const, text: chunk }].slice(-8);
          });
        } else if (m.type === "text_complete") {
          streaming.current = "";
        }
      } catch {
        // not a caption message
      }
    });
    r.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      setAgentTalking(speakers.some((s) => s.identity !== r.localParticipant.identity));
    });
    r.on(RoomEvent.Disconnected, () => finish());

    try {
      await r.connect(data.connectionUrl, data.token);
    } catch (err) {
      console.warn("Vaani connect failed", err);
      await finish();
      setError("We couldn't connect the call. Please check your connection and try again.");
      setPhase("form");
    }
  }

  async function toggleMute() {
    const next = !muted;
    await room.current?.localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
  }

  const first = name.trim().split(" ")[0];

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/enquiry/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enquiryId: enquiryId.current, email }),
    });
    if (res.ok) setEmailSaved(true);
    else setError((await res.json().catch(() => ({}))).error ?? "Please check the email and try again.");
  }

  if (phase === "fallback" && !emailSaved) {
    return (
      <form onSubmit={saveEmail} className="mx-auto max-w-md space-y-3 rounded-[2.5rem] bg-white p-8 text-center shadow-soft">
        <p className="text-lg text-stone-700">We couldn&rsquo;t connect the call just now. Leave your email and the studio will reach out.</p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@gmail.com"
          autoComplete="email"
          required
          className="w-full rounded-full border border-stone-200 bg-stone-50 px-6 py-3.5 outline-none focus:border-coral"
        />
        {error && <p className="text-sm text-coral-deep">{error}</p>}
        <button className="w-full rounded-full bg-ink px-6 py-3.5 font-medium text-cream">Send</button>
      </form>
    );
  }

  if (phase === "ended" || phase === "fallback") {
    return (
      <div className="mx-auto max-w-md rounded-[2.5rem] bg-white p-8 text-center shadow-soft">
        <p className="font-hand text-4xl text-coral-deep">thank you{first ? `, ${first}` : ""}</p>
        <p className="mt-3 text-lg text-stone-700">
          {phase === "ended"
            ? "Your designer will have the full conversation before you meet, so you won't need to repeat yourself. If we booked a time, the calendar invite is on its way to your email."
            : "Thanks — someone from the studio will email you shortly."}
        </p>
      </div>
    );
  }

  if (phase === "connecting" || phase === "live") {
    return (
      <div className="mx-auto max-w-md rounded-[2.5rem] bg-white p-6 shadow-soft sm:p-8" aria-live="polite">
        <div ref={audioBox} hidden />
        <div className="flex flex-col items-center text-center">
          <span
            className={`grid size-24 place-items-center rounded-full bg-coral transition-transform duration-700 ${
              agentTalking ? "animate-breathe scale-105" : ""
            }`}
          >
            <span className="size-4 rounded-full bg-white" />
          </span>
          <p className="mt-4 text-lg font-medium">{phase === "connecting" ? "Connecting you to Aangan…" : "On call with Aangan"}</p>
          <p className="text-sm text-muted">{phase === "live" ? clock(seconds) : "Allow the microphone if your browser asks"}</p>
        </div>

        {lines.length > 0 && (
          <ol className="mt-6 max-h-56 space-y-2 overflow-y-auto">
            {lines.map((l) => (
              <li key={l.id} className={`text-[15px] leading-snug ${l.who === "you" ? "text-right text-stone-500" : "text-stone-800"}`}>
                {l.text}
              </li>
            ))}
          </ol>
        )}

        {phase === "live" && (
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={toggleMute} className="rounded-full border border-stone-200 px-5 py-2.5 text-sm font-medium">
              {muted ? "Unmute" : "Mute"}
            </button>
            <button onClick={finish} className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream transition-transform duration-500 hover:scale-105">
              End call
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={start} className="mx-auto max-w-md space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        autoComplete="name"
        required
        className="w-full rounded-full border border-stone-200 bg-stone-50 px-6 py-3.5 outline-none focus:border-coral"
      />
      {error && <p className="px-4 text-sm text-coral-deep">{error}</p>}
      <button className="w-full rounded-full bg-ink px-6 py-3.5 font-medium text-cream transition-transform duration-500 hover:scale-[1.03]">
        Call Aangan now
      </button>
      <p className="px-4 text-center text-xs leading-relaxed text-stone-400">
        You&rsquo;ll talk to our virtual assistant in your browser. The call is recorded and transcribed so your designer
        has the full context. The assistant will ask for your email so we can follow up.
      </p>
    </form>
  );
}
