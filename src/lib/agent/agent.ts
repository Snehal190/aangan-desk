import { DESIGNERS } from "../designers";
import { geminiGenerate } from "../integrations/gemini";
import { loadKnowledge } from "../integrations/knowledge";
import { formatIST } from "../format";
import type { TranscriptTurn } from "../types";

// The in-call "brain": given the conversation so far, produce the agent's
// next line. Used by the test-call page today; Vaani will call the same thing.

export const GREETING =
  "Hello, you've reached Aangan Studio. I'm the studio's virtual assistant — how can I help you today?";

const END = "[END]";

/** Consultation slots the agent may offer: next working days (Mon–Sat), 11 am and 4 pm IST.
 *  Replaced by real Cal.com availability once it is connected. */
export function openSlots(from = new Date(), count = 6): string[] {
  const slots: string[] = [];
  const day = new Date(from.getTime() + 5.5 * 3_600_000); // shift to IST wall-clock
  for (let d = 1; slots.length < count && d < 14; d++) {
    const t = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + d));
    if (t.getUTCDay() === 0) continue; // studio closed Sundays
    const ymd = t.toISOString().slice(0, 10);
    slots.push(`${ymd}T11:00:00+05:30`, `${ymd}T16:00:00+05:30`);
  }
  return slots.slice(0, count);
}

export const slotLabel = (iso: string) =>
  formatIST(iso, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });

async function systemPrompt(slots: string[]) {
  const k = await loadKnowledge();
  const designer = DESIGNERS[0];
  return `You are the virtual assistant answering the phone for Aangan Studio, an interior design studio in Pune. You are on a live voice call.

HOW TO SPEAK
- Warm, calm, like a good front-desk person in Pune. 1–3 short sentences per turn. One question at a time.
- This is speech: no lists, markdown, emojis or URLs. Say numbers the way people say them.
- Reply in the caller's language (English, Hindi, Marathi or Hinglish).
- Never invent anything about the studio that is not in the documents below.

WHAT TO FIND OUT (Nikhil's rubric, qualified.md)
1. Real project with execution (not advice only)  2. Site in Pune city or PCMC  3. Realistic timeline
4. Budget — never ask; only react if the caller volunteers a number clearly too low for the scope
5. Decision-maker — ask lightly once; do not push.
Also learn: what kind of space, rough size, rooms, current state, and the caller's name.
If 1, 2 or 3 is unclear, ask one direct question. Do not interrogate — gather what you can naturally.

PRICING
Follow pricing.md: you may share the indicative range for the relevant tier, always adding that it is only indicative and the designer gives the actual quote after seeing the site. Never a single figure or total for their project.

OUTCOMES
- Qualified: tell them it sounds like a great fit. Offer two of the open slots below and ask whether they'd prefer a site visit, the studio, or a video call. When they choose, confirm in one sentence: "Done — I've booked you with our designer ${designer.name} on <day, date, time>." Get their name first if you don't have it. Only ever offer slots from the list.
- Not a fit (outside area, out of scope, advice-only, impossible timeline, budget clearly too low, or two criteria fail): explain honestly and kindly, as qualified.md suggests, and do not book.
- Existing client with a complaint: apologise, take their name, project and designer, promise a senior callback within 15 minutes. Do not qualify them.
- When the conversation is finished (booked, declined, or the caller is done), say a short goodbye and put ${END} at the very end of that reply.

OPEN SLOTS (designer: ${designer.name})
${slots.map((s) => `- ${slotLabel(s)}`).join("\n")}

## services.md
${k.services}

## qualified.md
${k.qualified}

## pricing.md
${k.pricing}`;
}

export async function agentReply(transcript: TranscriptTurn[], slots: string[]) {
  const contents = [
    { role: "user", parts: [{ text: "(The call has connected.)" }] },
    ...transcript.map((t) => ({ role: t.speaker === "agent" ? "model" : "user", parts: [{ text: t.text }] })),
  ];
  const raw = await geminiGenerate({
    systemInstruction: { parts: [{ text: await systemPrompt(slots) }] },
    contents,
    generationConfig: { temperature: 0.4 },
  });
  const ended = raw.includes(END);
  return { text: raw.replace(END, "").trim(), ended };
}
