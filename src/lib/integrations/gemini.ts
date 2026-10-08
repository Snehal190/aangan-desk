import { CRITERIA_ORDER } from "../rubric";
import type { CriterionResult, LeadStatus, Priority, ProjectFacts, TranscriptTurn } from "../types";
import { env, NotConfiguredError } from "./env";
import { loadKnowledge } from "./knowledge";

// Post-call analysis: turn a finished transcript into the structured report
// the console shows. (Live in-call replies are driven through Vaani and will
// get their own prompt once the user shares it.)

export interface CallAnalysis {
  callerName: string;
  status: LeadStatus;
  headline: string;
  project: ProjectFacts;
  criteria: CriterionResult[];
  handoffNote: string;
  alreadyAnswered: string[];
  openQuestions: string[];
  flags: string[];
  nextStep?: string;
  priority?: Priority;
  priorityReason?: string;
}

const verdict = { type: "STRING", enum: ["pass", "unclear", "fail"] };
const strings = { type: "ARRAY", items: { type: "STRING" } };

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    callerName: { type: "STRING" },
    status: { type: "STRING", enum: ["qualified", "needs_review", "not_fit", "escalation"] },
    headline: { type: "STRING", description: "Under 60 characters, e.g. '3BHK full redesign, Kothrud · referral'" },
    project: {
      type: "OBJECT",
      properties: {
        kind: { type: "STRING", enum: ["residential", "commercial", "unknown"] },
        summary: { type: "STRING" },
        location: { type: "STRING" },
        carpetSqft: { type: "NUMBER" },
        rooms: strings,
        currentState: { type: "STRING" },
        timeline: { type: "STRING" },
        budgetVolunteered: { type: "STRING" },
        decisionMaker: { type: "STRING" },
        referral: { type: "STRING" },
      },
      required: ["kind", "summary", "rooms"],
    },
    criteria: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          key: { type: "STRING", enum: CRITERIA_ORDER },
          verdict,
          reason: { type: "STRING" },
          evidenceTurn: { type: "INTEGER" },
        },
        required: ["key", "verdict", "reason"],
      },
    },
    handoffNote: { type: "STRING" },
    alreadyAnswered: strings,
    openQuestions: strings,
    flags: strings,
    nextStep: { type: "STRING" },
    priority: { type: "STRING", enum: ["high", "medium", "low"] },
    priorityReason: { type: "STRING" },
  },
  required: ["callerName", "status", "headline", "project", "criteria", "handoffNote", "alreadyAnswered", "openQuestions", "flags"],
};

// Keys are used round-robin. A key that is rate-limited, overloaded or
// rejected hands the request to the next one; we only fail once all have.
let cursor = 0;
const RETRYABLE = new Set([401, 403, 429, 500, 503]);

export async function geminiGenerate(body: unknown): Promise<string> {
  const keys = env.gemini.apiKeys;
  if (keys.length === 0) throw new NotConfiguredError("Gemini");

  const failures: string[] = [];
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const i = cursor++ % keys.length;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.gemini.model}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": keys[i] },
        body: JSON.stringify(body),
      },
    );
    if (res.ok) {
      const data = await res.json();
      const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini returned no content");
      return text;
    }
    failures.push(`key ${i + 1}: ${res.status}`);
    if (!RETRYABLE.has(res.status)) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  }
  throw new Error(`All Gemini keys busy or rejected (${failures.join(", ")})`);
}

export async function analyseCall(transcript: TranscriptTurn[]): Promise<CallAnalysis> {
  const k = await loadKnowledge();

  const system = [
    "You review phone enquiries for Aangan Studio, an interior design studio in Pune.",
    "Score the call against the rubric exactly as written. Never invent facts the caller did not say.",
    "Statuses: qualified (passes rubric), needs_review (unclear on 1–3 and the call ended), not_fit (fails per rubric), escalation (existing client / complaint).",
    "The handoff note is for the designer: 3–5 sentences, plain English, so they never re-ask what was answered.",
    "evidenceTurn is the 0-based index of the transcript line that proves the verdict.",
    "Priority (qualified leads only): high = large scope, referral or tight-but-feasible timeline; medium = standard full home or office; low = single room or loose interest. Give a one-line priorityReason.",
    `\n## services.md\n${k.services}`,
    `\n## qualified.md (rubric)\n${k.qualified}`,
    `\n## pricing.md\n${k.pricing}`,
  ].join("\n");

  const lines = transcript.map((t, i) => `[${i}] ${t.speaker === "agent" ? "Agent" : "Caller"} (${t.at}): ${t.text}`).join("\n");

  const text = await geminiGenerate({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: `Transcript:\n${lines}` }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA, temperature: 0.2 },
  });
  return JSON.parse(text) as CallAnalysis;
}
