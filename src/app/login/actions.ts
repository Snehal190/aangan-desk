"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, passcodeMatches, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth";

export async function login(_: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const name = String(form.get("name") ?? "").trim().slice(0, 40);
  const passcode = String(form.get("passcode") ?? "");
  const next = String(form.get("next") ?? "/");

  if (!name) return { error: "Please add your name." };
  if (!passcodeMatches(passcode)) return { error: "That passcode doesn't match." };

  (await cookies()).set(SESSION_COOKIE, createSession(name), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  // Only same-site paths, never "//evil.com".
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
