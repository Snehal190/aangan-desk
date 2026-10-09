import { requireSession } from "@/lib/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Accordion } from "@/components/accordion";
import { Flag, PriorityPill, StatusPill, VerdictPill } from "@/components/pills";
import { Reveal } from "@/components/reveal";
import { LiveRefresh } from "@/components/live-refresh";
import { agentDecision } from "@/lib/decision";
import { getDesigner } from "@/lib/designers";
import { duration, MODE_LABEL, when } from "@/lib/format";
import { CRITERIA, CRITERIA_ORDER, STATUS_META } from "@/lib/rubric";
import { getLead } from "@/lib/store";
import type { Lead } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/desk/leads/[id]">) {
  await requireSession();
  const lead = await getLead((await params).id);
  return { title: lead ? `${lead.callerName} · Aangan Desk` : "Not found" };
}

const DECISION_TONE: Record<Lead["status"], { box: string; label: string }> = {
  qualified: { box: "bg-sage text-ink", label: "text-sage-deep" },
  not_fit: { box: "bg-blush text-ink", label: "text-coral-deep" },
  needs_review: { box: "bg-lavender text-ink", label: "text-lavender-deep" },
  escalation: { box: "bg-ink text-cream", label: "text-coral" },
};

export default async function LeadReport({ params }: PageProps<"/desk/leads/[id]">) {
  await requireSession();
  const lead = await getLead((await params).id);
  if (!lead) notFound();

  const designer = getDesigner(lead.booking?.designerId);
  const evidence = new Set(lead.criteria.map((c) => c.evidenceTurn).filter((n) => n !== undefined));
  const decision = agentDecision(lead);
  const tally = (v: string) => lead.criteria.filter((c) => c.verdict === v).length;

  return (
    <article className="space-y-10">
      <LiveRefresh seconds={30} />
      <Reveal>
        <Link href="/desk" className="text-sm text-muted transition-colors duration-500 hover:text-ink">
          ← All calls
        </Link>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <StatusPill status={lead.status} />
          {lead.priority && <PriorityPill priority={lead.priority} />}
          {lead.flags.map((f) => (
            <Flag key={f}>{f}</Flag>
          ))}
        </div>
        <h1 className="mt-4 text-5xl font-medium tracking-tight sm:text-6xl">{lead.callerName}</h1>
        <p className="mt-2 text-lg text-muted">{lead.headline}</p>
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-400">
          <span>{when(lead.receivedAt)}</span>
          <span>{duration(lead.durationSec)} call</span>
          <span>Picked up in {lead.pickupSec}s</span>
          <span>{lead.language}</span>
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="text-ink underline decoration-stone-300 underline-offset-4">
              {lead.email}
              {lead.emailConfirmed ? " ✓ confirmed" : " (not confirmed)"}
            </a>
          )}
          {lead.phone && <span>{lead.phone}</span>}
          {!lead.email && !lead.phone && <span className="text-coral-deep">No contact details</span>}
        </p>
      </Reveal>

      <Reveal>
        <section className={`rounded-[2rem] p-6 sm:p-8 ${DECISION_TONE[lead.status].box}`} aria-label="Agent's decision">
          <p className={`text-sm font-medium ${DECISION_TONE[lead.status].label}`}>Agent&rsquo;s decision</p>
          <h2 className="mt-1 text-3xl font-medium tracking-tight sm:text-4xl">{decision.title}</h2>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed">{decision.body}</p>
          {lead.status === "qualified" && lead.priority && lead.priorityReason && (
            <p className={`mt-3 text-[15px] ${DECISION_TONE[lead.status].label}`}>
              {lead.priority[0].toUpperCase() + lead.priority.slice(1)} priority — {lead.priorityReason}
            </p>
          )}
          <div className="mt-6 flex items-center gap-3">
            <span className="h-px w-8 bg-current opacity-40" />
            <span className="font-hand text-2xl opacity-70">Aangan voice agent</span>
          </div>
        </section>
      </Reveal>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          <Reveal>
            <div className="-rotate-1 rounded-[2rem] bg-white p-6 shadow-soft sm:p-8">
              <p className="text-sm text-stone-400">Handoff note</p>
              <p className="mt-3 text-lg leading-relaxed text-stone-800">{lead.handoffNote}</p>
              <div className="mt-6 flex items-center gap-3">
                <span className="h-px w-8 bg-stone-300" />
                <span className="font-hand text-2xl text-stone-500">Aangan voice agent</span>
              </div>
            </div>
          </Reveal>

          {(lead.alreadyAnswered.length > 0 || lead.openQuestions.length > 0) && (
            <Reveal className="grid gap-4 sm:grid-cols-2">
              <List title="Already answered — don't re-ask" items={lead.alreadyAnswered} tone="bg-sage" />
              <List title="Worth covering" items={lead.openQuestions} tone="bg-lavender" />
            </Reveal>
          )}

          {lead.criteria.length > 0 && (
            <Reveal>
              <h2 className="text-2xl font-medium tracking-tight">
                Why <span className="font-hand text-3xl font-normal text-coral-deep">{STATUS_META[lead.status].label.toLowerCase()}</span>
              </h2>
              <p className="mt-1 text-sm text-muted">
                {tally("pass")} pass · {tally("unclear")} unclear · {tally("fail")} fail — against Nikhil&rsquo;s five-point rubric
              </p>
              <div className="mt-5 space-y-3">
                {CRITERIA_ORDER.map((key) => {
                  const c = lead.criteria.find((x) => x.key === key);
                  if (!c) return null;
                  const turn = c.evidenceTurn !== undefined ? lead.transcript[c.evidenceTurn] : undefined;
                  return (
                    <Accordion key={key} title={CRITERIA[key].label} aside={<VerdictPill verdict={c.verdict} />} defaultOpen={c.verdict !== "pass"}>
                      <p className="text-sm text-stone-400">{CRITERIA[key].question}</p>
                      <p className="mt-2 text-stone-700">{c.reason}</p>
                      {turn && (
                        <blockquote className="mt-4 rounded-2xl bg-cream p-4 text-[15px] text-stone-600">
                          <span className="block text-xs text-stone-400">
                            {turn.speaker === "caller" ? lead.callerName : "Agent"} · {turn.at}
                          </span>
                          &ldquo;{turn.text}&rdquo;
                        </blockquote>
                      )}
                    </Accordion>
                  );
                })}
              </div>
            </Reveal>
          )}

          <Reveal>
            <Accordion
              title={<span className="text-xl tracking-tight">Full transcript</span>}
              aside={<span className="text-sm text-stone-400">{lead.transcript.length} lines</span>}
            >
              <Transcript lead={lead} highlight={evidence} />
            </Accordion>
          </Reveal>
        </div>

        <aside className="space-y-4">
          <Reveal>
            {lead.booking && designer ? (
              <div className="rounded-[2rem] bg-ink p-6 text-cream">
                <p className={`text-sm ${lead.booking.status === "confirmed" ? "text-stone-400" : "text-coral"}`}>
                  {lead.booking.status === "confirmed" ? "On the designer\u2019s calendar" : "Slot held \u2014 not on the calendar yet"}
                </p>
                <p className="mt-2 text-2xl font-medium tracking-tight">{when(lead.booking.start)}</p>
                <p className="mt-1 text-stone-300">
                  {MODE_LABEL[lead.booking.mode]} · {lead.booking.durationMin} min
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-coral font-medium text-ink">{designer.name[0]}</span>
                  <span>{designer.name}</span>
                </div>
                <p className="mt-5 text-sm text-stone-400">
                  {lead.booking.emailSentAt ? `Report emailed ${when(lead.booking.emailSentAt)}` : "Report email not sent yet"}
                </p>
              </div>
            ) : (
              <div className="rounded-[2rem] border border-stone-200 bg-white p-6 text-muted">No designer call booked.</div>
            )}
          </Reveal>

          <Reveal>
            <dl className="space-y-4 rounded-[2rem] bg-white p-6 shadow-soft">
              <Fact label="Project" value={lead.project.summary} />
              <Fact label="Location" value={lead.project.location} />
              <Fact label="Carpet area" value={lead.project.carpetSqft ? `${lead.project.carpetSqft.toLocaleString("en-IN")} sq ft` : undefined} />
              <Fact label="Current state" value={lead.project.currentState} />
              <Fact label="Timeline" value={lead.project.timeline} />
              <Fact label="Budget (volunteered)" value={lead.project.budgetVolunteered} />
              <Fact label="Decision-maker" value={lead.project.decisionMaker} />
              <Fact label="Came via" value={lead.project.referral} />
              {lead.project.rooms.length > 0 && (
                <div>
                  <dt className="text-sm text-stone-400">Rooms</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {lead.project.rooms.map((r) => (
                      <Flag key={r}>{r}</Flag>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </Reveal>

          <p className="px-2 text-sm text-stone-400">
            {lead.hubspotDealId ? `Synced to HubSpot · ${lead.hubspotDealId}` : "Not synced to HubSpot"}
          </p>
        </aside>
      </div>
    </article>
  );
}

function List({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (items.length === 0) return null;
  return (
    <div className={`rounded-[2rem] p-6 ${tone}`}>
      <p className="font-medium">{title}</p>
      <ul className="mt-3 space-y-2 text-[15px] text-stone-700">
        {items.map((x) => (
          <li key={x} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-stone-400" />
            {x}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Fact({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-sm text-stone-400">{label}</dt>
      <dd className="mt-0.5 text-stone-800">{value}</dd>
    </div>
  );
}

function Transcript({ lead, highlight }: { lead: Lead; highlight: Set<number | undefined> }) {
  return (
    <ol className="space-y-3">
      {lead.transcript.map((t, i) => (
        <li key={i} className={`flex ${t.speaker === "caller" ? "justify-end" : ""}`}>
          <div
            className={`max-w-[85%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed ${
              t.speaker === "caller" ? "bg-cream text-stone-800" : "bg-stone-50 text-stone-600"
            } ${highlight.has(i) ? "ring-2 ring-coral" : ""}`}
          >
            <span className="mb-0.5 block text-xs text-stone-400">
              {t.speaker === "caller" ? lead.callerName : "Agent"} · {t.at}
            </span>
            {t.text}
          </div>
        </li>
      ))}
      <li className="pt-2 text-xs text-stone-400">
        <span className="mr-2 inline-block size-2 rounded-full ring-2 ring-coral" />
        Lines the rubric verdict is based on
      </li>
    </ol>
  );
}
