import type { Designer } from "./types";

// Single designer for now; every booking goes to this calendar and inbox.
// Add the rest of the team here once their Cal.com usernames exist.
export const DESIGNERS: Designer[] = [
  {
    id: "snehal",
    name: "Snehal Kapoor",
    email: "snehalbandi5@gmail.com",
    calUsername: process.env.CAL_USERNAME ?? "",
  },
];

export function getDesigner(id: string | undefined) {
  return DESIGNERS.find((d) => d.id === id);
}
