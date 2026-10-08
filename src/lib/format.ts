import { formatIST } from "./store";

export function when(iso: string) {
  return formatIST(iso, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function timeOnly(iso: string) {
  return formatIST(iso, { hour: "numeric", minute: "2-digit" });
}

export function dayLabel(iso: string) {
  return formatIST(iso, { weekday: "long", day: "numeric", month: "long" });
}

export function duration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export const MODE_LABEL = { site_visit: "Site visit", studio: "At the studio", video: "Video call" } as const;
