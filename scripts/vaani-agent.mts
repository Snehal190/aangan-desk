// Creates the Aangan enquiry agent in Vaani AI, or updates it when
// VAANI_AGENT_ID is already set. Re-run after editing /knowledge:
//   npm run vaani:sync  (scripts/vaani-agent.mts)
import { openSlots, systemPrompt, VAANI_END_PHRASE, webGreeting } from "../src/lib/agent/agent";

const API = "https://api.vaanivoice.ai";
const key = process.env.VAANI_API_KEY;
if (!key) throw new Error("VAANI_API_KEY is not set");
const headers = { "X-API-Key": key, "content-type": "application/json" };

const persona = {
  identity: {
    personality: { tone: "warm", style: "calm, concise front-desk assistant" },
    greeting_message: { agent_message: webGreeting(), agent_speech_delay: 1, interruptible: true, let_user_speak_first: false },
    system_prompt: await systemPrompt(openSlots(), { channel: "vaani" }),
  },
  senses_capabilities: { language: "en", auto_detect: false },
  timezone: "Asia/Kolkata",
};
const experience = {
  settings: {
    end_call: { enabled: true, end_call_phrase: VAANI_END_PHRASE, hangup_timeout: 2 },
    idle_conversation_settings: {
      pulse_check: true,
      end_conversation_on_idle: true,
      idle_call_warning_timeout: 15,
      idle_call_warning_message: "Are you still there?",
      idle_call_hangup_timeout: 30,
      idle_call_hangup_message: "It seems you've stepped away. Please call again whenever you're ready. Take care.",
    },
    call_settings: { max_call_duration: 12, max_duration_enabled: true },
  },
};

async function call(method: string, path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, { method, headers, body: JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

const existing = process.env.VAANI_AGENT_ID;
if (existing) {
  await call("PATCH", `/api/agent/${existing}/persona`, persona);
  await call("PATCH", `/api/agent/${existing}/experience`, experience);
  console.log(`Updated agent ${existing}`);
} else {
  const r = await call("POST", "/api/create-agent", {
    agent_display_name: "Aangan Enquiry Agent",
    config: { persona, experience },
  });
  console.log(`Created agent "${r.agent_name}"\nVAANI_AGENT_ID=${r.agent_id}`);
}
