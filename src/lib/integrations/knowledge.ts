import { readFile } from "node:fs/promises";
import path from "node:path";

// The four documents the agent reasons from. Edit the files in /knowledge,
// not strings in code.
const FILES = {
  services: "services.md",
  qualified: "qualified.md",
  pricing: "pricing.md",
  pastEnquiries: "past-enquiries.txt",
} as const;

let cache: Record<keyof typeof FILES, string> | undefined;

export async function loadKnowledge() {
  if (cache) return cache;
  const dir = path.join(process.cwd(), "knowledge");
  const entries = await Promise.all(
    Object.entries(FILES).map(async ([k, f]) => [k, await readFile(path.join(dir, f), "utf8")] as const),
  );
  cache = Object.fromEntries(entries) as Record<keyof typeof FILES, string>;
  return cache;
}
