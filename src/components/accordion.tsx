"use client";

import { useId, useState, type ReactNode } from "react";

export function Accordion({
  title,
  aside,
  children,
  defaultOpen = false,
}: {
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <div className="rounded-2xl border border-stone-100 bg-white">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-5 text-left font-medium sm:p-6"
      >
        <span className="flex-1">{title}</span>
        {aside}
        <svg
          viewBox="0 0 24 24"
          className={`size-5 shrink-0 text-muted transition-transform duration-500 ease-in-out ${open ? "rotate-45" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <div
        id={id}
        className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-6 sm:px-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
