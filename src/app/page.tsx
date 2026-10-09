import Link from "next/link";
import { Accordion } from "@/components/accordion";
import { Reveal } from "@/components/reveal";
import { EnquireCall } from "@/components/site/enquire-call";

// Public Aangan Studio site. Everything here comes from knowledge/services.md —
// no invented projects, reviews or prices.

const SERVICES = [
  { tag: "Planning", text: "Space planning that makes every corner work" },
  { tag: "Kitchens", text: "Modular kitchens and wardrobes, built to fit" },
  { tag: "Furniture", text: "Custom pieces, plus the right sourced ones" },
  { tag: "Light", text: "Lighting designed room by room" },
  { tag: "Materials", text: "Flooring, walls and ceilings chosen with you" },
  { tag: "Execution", text: "Our own contractors, supervised to the end" },
];

const AREAS = [
  "Kothrud", "Baner", "Aundh", "Wakad", "Koregaon Park", "Kalyani Nagar", "Viman Nagar", "Hadapsar", "Magarpatta",
  "NIBM", "Kondhwa", "Undri", "Shivane", "Warje", "Erandwane", "Deccan", "Pimpri", "Chinchwad", "Pimple Saudagar",
  "Pimple Nilakh", "Ravet", "Hinjewadi",
];

const STEPS = [
  { n: "01", title: "Talk to us", body: "Tap Enquire and talk to our assistant right here in your browser — any time of day. It takes about five minutes." },
  { n: "02", title: "Meet your designer", body: "If we're a fit, we book a consultation on the spot — at your site, at the studio, or on video. Your designer already knows your brief." },
  { n: "03", title: "Design, then build", body: "Design takes 3–4 weeks. Execution follows in 8–16 weeks, depending on size and how ready the site is." },
];

const NOT_US = [
  { title: "Structural work", body: "We're interior designers, not architects — we don't move walls or handle structural permits." },
  { title: "Styling-only visits", body: "Our smallest project is one room, fully redesigned and executed — not advice on colours." },
  { title: "Restaurants, hotels, retail, gyms", body: "We focus on homes and offices up to about 3,000 sq ft." },
];

const FAQ = [
  { q: "What's the smallest project you take on?", a: "A single room — bedroom or living room — redesigned completely, with materials, furniture and execution included. For homes, we usually do full homes from 2BHK upwards, a full floor, or two or more rooms." },
  { q: "Which areas do you work in?", a: "Pune city and PCMC. We don't currently take projects in Talegaon, Lonavala, Nashik, Mumbai or other cities, because our execution depends on our own contractor network being nearby." },
  { q: "How long does it take?", a: "Design takes 3–4 weeks from the first consultation. Execution takes 8–16 weeks depending on the project and how ready the site is. We can't start a project that needs to be finished in under 6 weeks." },
  { q: "How much will it cost?", a: "It depends on the site, the materials you choose and the scope. On the call we can share an indicative range; your designer gives you the actual quote after seeing the site." },
  { q: "I'm renting — can you still help?", a: "Yes, as long as there are no structural changes. We design with reversible fittings and a modular kitchen that can come out cleanly." },
  { q: "Do you follow Vastu?", a: "We incorporate Vastu requirements into the design. We don't offer standalone Vastu consultations." },
];

export default function Home() {
  return (
    <>
      <header className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
        <nav className="flex w-full max-w-3xl items-center gap-2 rounded-full border border-white/60 bg-white/70 py-2 pr-2 pl-3 shadow-soft backdrop-blur-[20px]">
          <Link href="/" className="flex items-center gap-2" aria-label="Aangan Studio home">
            <span className="grid size-7 place-items-center rounded-full bg-coral">
              <span className="size-2 rounded-full bg-white" />
            </span>
            <span className="text-[15px] font-medium tracking-tight">Aangan</span>
          </Link>
          <div className="ml-2 hidden flex-1 items-center gap-1 sm:flex">
            {[
              ["#services", "What we do"],
              ["#how", "How it works"],
              ["#faq", "Questions"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors duration-500 hover:text-ink">
                {label}
              </a>
            ))}
          </div>
          <a href="#enquire" className="ml-auto rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream transition-transform duration-500 hover:scale-[1.03]">
            Enquire
          </a>
        </nav>
      </header>

      <main className="overflow-x-hidden">
        <section className="mx-auto max-w-5xl px-4 pt-40 pb-20 text-center sm:px-6">
          <Reveal>
            <p className="text-sm font-medium text-muted">Aangan Studio · Interiors in Pune &amp; PCMC</p>
            <h1 className="mt-5 text-5xl leading-[1.02] font-medium tracking-tight sm:text-7xl md:text-8xl">
              Homes that feel like <span className="font-hand text-6xl font-normal text-coral-deep sm:text-8xl md:text-9xl">yours</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[500px] text-lg text-muted">
              End-to-end interior design and execution for homes and small offices — from the first sketch to the last
              light fitting.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <a href="#enquire" className="rounded-full bg-coral px-7 py-3.5 font-medium text-ink shadow-coral transition-transform duration-500 hover:scale-[1.03]">
                Talk to us now
              </a>
              <a href="#how" className="rounded-full border border-stone-200 bg-white px-7 py-3.5 font-medium transition-transform duration-500 hover:scale-[1.03]">
                How it works
              </a>
            </div>
          </Reveal>
        </section>

        <section id="services" className="scroll-mt-24 py-10">
          <Reveal className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
              Everything, <span className="font-hand text-4xl font-normal text-coral-deep sm:text-5xl">under one roof</span>
            </h2>
          </Reveal>
          <div className="no-scrollbar mt-6 flex snap-x gap-4 overflow-x-auto px-4 pb-6 sm:px-[max(1.5rem,calc((100vw-64rem)/2+1.5rem))]">
            {SERVICES.map((s) => (
              <div key={s.tag} className="group flex h-40 w-72 shrink-0 snap-start flex-col justify-between rounded-3xl bg-white p-5 shadow-soft">
                <span className="text-sm text-stone-400">{s.tag}</span>
                <span className="text-xl leading-snug text-stone-800 transition-colors duration-500 group-hover:text-coral-deep">{s.text}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-5xl scroll-mt-24 px-4 py-20 sm:px-6">
          <Reveal>
            <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
              Three <span className="font-hand text-4xl font-normal text-coral-deep sm:text-5xl">slow, careful</span> steps
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <div className={`h-full rounded-[2rem] p-7 shadow-soft ${["bg-white", "bg-sage", "bg-lavender"][i]}`}>
                  <span className="text-sm text-stone-400">{s.n}</span>
                  <h3 className="mt-6 text-2xl font-medium tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-stone-600">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <Reveal>
            <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
              Where we <span className="font-hand text-4xl font-normal text-coral-deep sm:text-5xl">work</span>
            </h2>
            <p className="mt-2 text-muted">Pune city and PCMC, including:</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {AREAS.map((a) => (
                <span key={a} className="rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-sm text-stone-600">
                  {a}
                </span>
              ))}
            </div>
          </Reveal>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <Reveal>
            <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
              What we <span className="font-hand text-4xl font-normal text-coral-deep sm:text-5xl">don&rsquo;t</span> do
            </h2>
            <p className="mt-2 max-w-[500px] text-muted">Better you hear it now than at the consultation.</p>
          </Reveal>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {NOT_US.map((n, i) => (
              <Reveal key={n.title} delay={i * 120}>
                <div className={`rounded-[2rem] bg-white p-7 shadow-soft ${i % 2 ? "rotate-1" : "-rotate-1"}`}>
                  <h3 className="text-xl font-medium tracking-tight">{n.title}</h3>
                  <p className="mt-2 text-stone-600">{n.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-16 sm:px-6">
          <Reveal>
            <h2 className="text-center text-3xl font-medium tracking-tight sm:text-4xl">
              Good <span className="font-hand text-4xl font-normal text-coral-deep sm:text-5xl">questions</span>
            </h2>
          </Reveal>
          <div className="mt-8 space-y-3">
            {FAQ.map((f) => (
              <Accordion key={f.q} title={f.q}>
                <p className="text-stone-600">{f.a}</p>
              </Accordion>
            ))}
          </div>
        </section>

        <section id="enquire" className="relative scroll-mt-24 px-4 py-24 sm:px-6">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="animate-float absolute top-10 left-1/2 size-[380px] -translate-x-1/2 rounded-full bg-blush opacity-70 blur-[100px]" />
            <div className="animate-float-slow absolute bottom-0 left-1/4 size-[300px] rounded-full bg-sage opacity-80 blur-[90px]" />
          </div>
          <Reveal className="text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-[1.25rem] bg-ink">
              <span className="size-3 rounded-full bg-coral" />
            </div>
            <h2 className="mt-8 text-4xl font-medium tracking-tight sm:text-6xl">
              Tell us about your <span className="font-hand text-5xl font-normal text-coral-deep sm:text-7xl">space</span>
            </h2>
            <p className="mx-auto mt-4 max-w-[500px] text-lg text-muted">
              Talk to us right now, day or night. If it&rsquo;s a fit, we&rsquo;ll book you in with a designer before you hang up.
            </p>
          </Reveal>
          <div className="mt-10">
            <EnquireCall />
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-10 text-sm text-stone-400 sm:px-6">
        <span>Aangan Studio · Pune</span>
        <Link href="/desk" className="hover:text-ink">
          Team login
        </Link>
      </footer>
    </>
  );
}
