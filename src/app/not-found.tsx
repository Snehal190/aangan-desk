import Link from "next/link";

export default function NotFound() {
  return (
    <main className="px-4 py-32 text-center">
      <p className="font-hand text-5xl text-coral-deep">hmm</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">We couldn&rsquo;t find that page.</h1>
      <Link href="/" className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream">
        Back to Aangan
      </Link>
    </main>
  );
}
