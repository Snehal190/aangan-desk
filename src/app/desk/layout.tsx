import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { requireSession } from "@/lib/session";
import { getStats } from "@/lib/store";

export const metadata: Metadata = {
  title: "Aangan Desk",
  description: "Call reports for the Aangan Studio front desk and designers",
};

export default async function DeskLayout({ children }: LayoutProps<"/desk">) {
  await requireSession();
  const { needsAttention } = await getStats();
  return (
    <>
      <Nav attention={needsAttention} />
      <main className="mx-auto w-full max-w-5xl px-4 pt-28 pb-24 sm:px-6">{children}</main>
    </>
  );
}
