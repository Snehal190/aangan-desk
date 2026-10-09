// Single place that reads secrets. Every integration checks `configured`
// before calling out, so the console still runs on sample data with no keys.
const list = (v?: string) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export const env = {
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL,
  auth: {
    passcode: process.env.TEAM_PASSCODE,
    secret: process.env.SESSION_SECRET,
  },
  vaani: {
    apiKey: process.env.VAANI_API_KEY,
    agentId: process.env.VAANI_AGENT_ID,
    webhookSecret: process.env.VAANI_WEBHOOK_SECRET,
    voiceGender: process.env.VAANI_VOICE_GENDER === "male" ? "male" : "female",
  },
  gemini: {
    apiKeys: list(process.env.GEMINI_API_KEYS ?? process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
  },
  cal: {
    apiKey: process.env.CAL_API_KEY,
    eventSlug: process.env.CAL_EVENT_SLUG ?? "consultation",
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.RESEND_FROM ?? "Aangan Desk <onboarding@resend.dev>",
  },
  hubspot: {
    token: process.env.HUBSPOT_TOKEN,
    pipelineId: process.env.HUBSPOT_PIPELINE_ID,
    stageQualified: process.env.HUBSPOT_STAGE_QUALIFIED,
  },
};

export const INTEGRATIONS = [
  { key: "neon", name: "Neon", role: "Database for calls and reports", configured: () => !!env.databaseUrl, vars: ["DATABASE_URL"] },
  { key: "vaani", name: "Vaani AI", role: "Voice agent for website enquiries (WebRTC) + post-call transcript", configured: () => !!env.vaani.apiKey && !!env.vaani.agentId, vars: ["VAANI_API_KEY", "VAANI_AGENT_ID", "VAANI_WEBHOOK_SECRET"] },
  { key: "gemini", name: "Gemini", role: `Rubric scoring and handoff note · ${env.gemini.apiKeys.length} key(s) in rotation`, configured: () => env.gemini.apiKeys.length > 0, vars: ["GEMINI_API_KEYS", "GEMINI_MODEL"] },
  { key: "cal", name: "Cal.com", role: "Books the designer's slot", configured: () => !!env.cal.apiKey, vars: ["CAL_API_KEY", "CAL_EVENT_SLUG"] },
  { key: "resend", name: "Resend", role: "Emails the report to the designer", configured: () => !!env.resend.apiKey, vars: ["RESEND_API_KEY", "RESEND_FROM"] },
  { key: "hubspot", name: "HubSpot", role: "Founder's view — contact, deal and call note", configured: () => !!env.hubspot.token, vars: ["HUBSPOT_TOKEN", "HUBSPOT_PIPELINE_ID", "HUBSPOT_STAGE_QUALIFIED"] },
] as const;

export class NotConfiguredError extends Error {
  constructor(service: string) {
    super(`${service} is not configured — add its keys to .env.local`);
  }
}
