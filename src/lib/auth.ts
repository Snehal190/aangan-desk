import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./integrations/env";

// Shared-passcode login for the front desk and designers. The session is a
// signed cookie: "<expiry>.<name>.<hmac>". No user table yet.
export const SESSION_COOKIE = "aangan_session";
export const SESSION_DAYS = 30;

const sign = (payload: string) =>
  createHmac("sha256", env.auth.secret ?? "").update(payload).digest("base64url");

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function createSession(name: string) {
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const payload = `${exp}.${Buffer.from(name).toString("base64url")}`;
  return `${payload}.${sign(payload)}`;
}

export function readSession(token: string | undefined): { name: string } | null {
  if (!token || !env.auth.secret) return null;
  const [exp, name, sig] = token.split(".");
  if (!exp || !name || !sig) return null;
  if (!safeEqual(sig, sign(`${exp}.${name}`))) return null;
  if (Number(exp) < Date.now()) return null;
  return { name: Buffer.from(name, "base64url").toString() };
}

export function passcodeMatches(input: string) {
  return !!env.auth.passcode && !!env.auth.secret && safeEqual(input, env.auth.passcode);
}
