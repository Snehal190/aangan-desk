"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Inbox" },
  { href: "/designer", label: "My calls" },
  { href: "/test-call", label: "Test call" },
  { href: "/setup", label: "Setup", desktopOnly: true },
];

export function Nav({ attention }: { attention: number }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/leads") : path.startsWith(href));

  return (
    <header className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
      <nav className="flex w-full max-w-3xl items-center gap-1 rounded-full border border-white/60 bg-white/70 py-2 pr-2 pl-3 shadow-soft backdrop-blur-[20px]">
        <Link href="/" className="mr-1 flex items-center gap-2 sm:mr-3" aria-label="Aangan Desk home">
          <span className="grid size-7 place-items-center rounded-full bg-coral">
            <span className="size-2 rounded-full bg-white" />
          </span>
          <span className="hidden text-[15px] font-medium tracking-tight sm:inline">Aangan Desk</span>
        </Link>
        <div className="flex flex-1 items-center gap-0.5">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 rounded-full px-2.5 py-1.5 text-sm sm:px-3 font-medium transition-colors duration-500 ${
                l.desktopOnly ? "hidden sm:block" : ""
              } ${active(l.href) ? "bg-stone-100 text-ink" : "text-muted hover:text-ink"}`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <Link
          href="/?status=attention"
          aria-label={`Needs you: ${attention}`}
          className="flex items-center gap-2 rounded-full bg-ink px-3 py-2 sm:px-4 text-sm font-medium text-cream transition-transform duration-500 hover:scale-[1.03]"
        >
          <span className="hidden sm:inline">Needs you</span>
          <span className="grid min-w-5 place-items-center rounded-full bg-coral px-1.5 text-xs text-ink">{attention}</span>
        </Link>
      </nav>
    </header>
  );
}
