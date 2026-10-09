import { Reveal } from "@/components/reveal";
import { logout } from "@/app/login/actions";
import { requireSession } from "@/lib/session";
import { env, INTEGRATIONS } from "@/lib/integrations/env";

const KNOWLEDGE = [
  { file: "services.md", use: "What we do and don't, service area, timelines" },
  { file: "qualified.md", use: "Nikhil's five-point rubric" },
  { file: "pricing.md", use: "Indicative ranges the agent may share — never a firm quote" },
  { file: "past-enquiries.txt", use: "September transcripts, used as tone examples" },
];

export default async function Setup() {
  const { name } = await requireSession();
  return (
    <div className="space-y-12">
      <Reveal className="pt-6">
        <h1 className="text-5xl font-medium tracking-tight sm:text-6xl">
          The <span className="font-hand text-6xl font-normal text-coral-deep sm:text-7xl">wiring</span>
        </h1>
        <p className="mt-3 max-w-[500px] text-lg text-muted">
          Which services are connected. Add keys to <code className="rounded bg-stone-100 px-1.5">.env.local</code> and
          restart; until then the console runs on sample calls.
        </p>
      </Reveal>

      <Reveal className="space-y-3">
        {INTEGRATIONS.map((i) => {
          const on = i.configured();
          return (
            <div key={i.key} className="flex flex-wrap items-center gap-4 rounded-[2rem] bg-white p-5 shadow-soft sm:p-6">
              <span className={`size-3 rounded-full ${on ? "bg-sage-deep" : "bg-stone-300"}`} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{i.name}</p>
                <p className="text-sm text-muted">{i.role}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {i.vars.map((v) => (
                  <code key={v} className="rounded-full bg-stone-50 px-2.5 py-0.5 text-xs text-stone-500">
                    {v}
                  </code>
                ))}
              </div>
              <span className={`text-sm ${on ? "text-sage-deep" : "text-stone-400"}`}>{on ? "Connected" : "Not set"}</span>
            </div>
          );
        })}
      </Reveal>

      <Reveal className="rounded-[2rem] bg-lavender p-6">
        <p className="font-medium">Vaani webhook</p>
        <p className="mt-1 text-sm text-lavender-deep">Point Vaani&rsquo;s &ldquo;call ended&rdquo; event here, with the shared secret in an <code>x-vaani-secret</code> header.</p>
        <code className="mt-3 block overflow-x-auto rounded-2xl bg-white/70 px-4 py-3 text-sm">{env.appUrl}/api/webhooks/vaani</code>
      </Reveal>

      <Reveal>
        <h2 className="px-1 text-2xl font-medium tracking-tight">What the agent reads</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {KNOWLEDGE.map((k) => (
            <div key={k.file} className="rounded-[2rem] bg-white p-5 shadow-soft">
              <code className="text-sm">knowledge/{k.file}</code>
              <p className="mt-1 text-sm text-muted">{k.use}</p>
            </div>
          ))}
        </div>
      </Reveal>
      <form action={logout} className="flex items-center justify-between rounded-[2rem] bg-white p-5 shadow-soft sm:p-6">
        <span className="text-muted">Signed in as {name}</span>
        <button className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium">Sign out</button>
      </form>
    </div>
  );
}
