import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "You're offline — Kasi-Connect",
};

export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ember/10 text-2xl">
        📴
      </div>
      <h1 className="font-display text-2xl font-bold text-ink">
        You&apos;re offline
      </h1>
      <p className="text-sm text-ink/60">
        Kasi-Connect can&apos;t reach the internet right now. Check your
        connection and try again — pages you&apos;ve visited before are still
        available.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-xl2 bg-ember px-5 py-2.5 text-sm font-semibold text-sand-50 transition hover:bg-ember-dark"
      >
        Try again
      </Link>
    </div>
  );
}
