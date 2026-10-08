import type { Metadata, Viewport } from "next";
import { Outfit, Reenie_Beanie } from "next/font/google";
import { Nav } from "@/components/nav";
import { getSession } from "@/lib/session";
import { getStats } from "@/lib/store";
import "./globals.css";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const reenie = Reenie_Beanie({ variable: "--font-reenie", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Aangan Desk",
  description: "Call reports for the Aangan Studio front desk and designers",
};

export const viewport: Viewport = { themeColor: "#FDFCF8" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  const attention = session ? (await getStats()).needsAttention : 0;
  return (
    <html lang="en" className={`${outfit.variable} ${reenie.variable} antialiased`}>
      <body className="min-h-dvh overflow-x-hidden">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="animate-float absolute -top-24 -left-24 size-[420px] rounded-full bg-blush opacity-60 blur-[90px]" />
          <div className="animate-float-slow absolute top-1/3 -right-32 size-[460px] rounded-full bg-lilac opacity-60 blur-[100px]" />
        </div>
        {session && <Nav attention={attention} />}
        <main className="mx-auto w-full max-w-5xl px-4 pt-28 pb-24 sm:px-6">{children}</main>
        <div aria-hidden className="grain" />
      </body>
    </html>
  );
}
