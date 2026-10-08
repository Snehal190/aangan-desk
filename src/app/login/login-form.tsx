"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, {});

  return (
    <form action={action} className="mx-auto mt-10 max-w-sm space-y-3 text-left">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="px-4 text-sm text-muted">Your name</span>
        <input
          name="name"
          autoComplete="name"
          required
          className="mt-1 w-full rounded-full border border-stone-200 bg-stone-50 px-5 py-3 outline-none focus:border-coral"
        />
      </label>
      <label className="block">
        <span className="px-4 text-sm text-muted">Team passcode</span>
        <input
          name="passcode"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-full border border-stone-200 bg-stone-50 px-5 py-3 outline-none focus:border-coral"
        />
      </label>
      {state.error && <p className="px-4 text-sm text-coral-deep">{state.error}</p>}
      <button
        disabled={pending}
        className="mt-2 w-full rounded-full bg-ink px-6 py-3 font-medium text-cream transition-transform duration-500 hover:scale-[1.03] disabled:opacity-60"
      >
        {pending ? "Opening…" : "Open the desk"}
      </button>
    </form>
  );
}
