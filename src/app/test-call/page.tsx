import { Reveal } from "@/components/reveal";
import { GREETING } from "@/lib/agent/agent";
import { requireSession } from "@/lib/session";
import { TestCall } from "./test-call";

export const metadata = { title: "Test call · Aangan Desk" };

export default async function TestCallPage() {
  await requireSession();
  return (
    <div className="space-y-10">
      <Reveal className="pt-6 text-center">
        <h1 className="text-5xl font-medium tracking-tight sm:text-6xl">
          Try the <span className="font-hand text-6xl font-normal text-coral-deep sm:text-7xl">agent</span>
        </h1>
        <p className="mx-auto mt-4 max-w-[500px] text-lg text-muted">
          Play the caller. The agent answers from the same knowledge as on the phone, and when the call ends the
          report lands in the inbox like any real call.
        </p>
      </Reveal>
      <TestCall greeting={GREETING} />
    </div>
  );
}
