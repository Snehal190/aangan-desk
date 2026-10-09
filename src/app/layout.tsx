import type { Metadata, Viewport } from "next";
import { Outfit, Reenie_Beanie } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const reenie = Reenie_Beanie({ variable: "--font-reenie", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Aangan Studio — interiors in Pune",
  description: "End-to-end interior design and execution for homes and small offices across Pune and PCMC.",
};

export const viewport: Viewport = { themeColor: "#FDFCF8" };

// Shared shell for the public site and the team desk: fonts, soft blobs, grain.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${reenie.variable} antialiased`}>
      <body className="min-h-dvh overflow-x-hidden">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="animate-float absolute -top-24 -left-24 size-[420px] rounded-full bg-blush opacity-60 blur-[90px]" />
          <div className="animate-float-slow absolute top-1/3 -right-32 size-[460px] rounded-full bg-lilac opacity-60 blur-[100px]" />
        </div>
        {children}
        <div aria-hidden className="grain" />
      </body>
    </html>
  );
}
