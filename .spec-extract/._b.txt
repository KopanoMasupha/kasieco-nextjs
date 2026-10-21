"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import { ArrowRight, Hand, Lock, Truck, Users2 } from "lucide-react";

/**
 * The one explanation of how buying works, used on the landing page (big)
 * and the Buy page (strip). Same four words everywhere in the app:
 * Reserve → Deal fills → Pay within 48 hours → Delivered.
 */
export const HOW_IT_WORKS = [
  {
    icon: Hand,
    title: "Reserve",
    when: "Today",
    body: "Pick a deal and how many you want. Reserving is free: you pay R0 today.",
    tag: "You pay R0",
  },
  {
    icon: Users2,
    title: "The deal fills",
    when: "As shops join",
    body: "Every shop that joins lowers the price. When it's full, the lowest price locks for everyone.",
    tag: "Price locks",
  },
  {
    icon: Lock,
    title: "Pay within 48 hours",
    when: "Once it's full",
    body: "Pay your share through TradeSafe escrow: instant EFT, card or cash at a till. If a deal never fills, you never pay.",
    tag: "Held safely",
  },
  {
    icon: Truck,
    title: "Delivered to your shop",
    when: "On your chosen day",
    body: "A driver brings it to your door. Count your stock, then give the driver your 4-digit code.",
    tag: "Code hand-over",
  },
] as const;

export default function HowItWorks({ variant = "big", className }: { variant?: "big" | "strip"; className?: string }) {
  if (variant === "strip")
    return (
      <ol className={clsx("grid grid-cols-2 gap-2 lg:grid-cols-4", className)} aria-label="How buying works">
        {HOW_IT_WORKS.map((s, i) => (
          <li key={s.title} className="flex items-start gap-2.5 rounded-2xl border border-ink/[0.08] bg-white px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
            <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ember font-display text-sm font-bold text-white sm:h-8 sm:w-8">{i + 1}</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{s.title}</span>
              <span className="block text-xs leading-snug text-ink/55">{s.tag} · {s.when.toLowerCase()}</span>
            </span>
          </li>
        ))}
      </ol>
    );

  return (
    <section className={clsx("mx-auto max-w-7xl px-5 sm:px-8", className)} aria-labelledby="how-it-works">
      <div className="max-w-2xl">
        <p className="eyebrow text-base !text-ember-dark sm:text-lg">How it works</p>
        <h2 id="how-it-works" className="mt-2 text-5xl font-bold leading-tight text-ink sm:text-6xl">
          Four steps from reserving to delivery
        </h2>
        <p className="mt-3 text-xl text-ink/60">You only pay once a deal is full, and every rand is held safely until your stock arrives.</p>
      </div>

      <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {HOW_IT_WORKS.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.08 }}
            className="relative flex flex-col rounded-3xl border border-ink/[0.08] bg-white p-6 shadow-[0_1px_2px_rgba(23,19,16,0.04)]"
          >
            <div className="flex items-center justify-between">
              <span className="num flex h-14 w-14 items-center justify-center rounded-2xl bg-ember font-display text-2xl font-extrabold text-white">{i + 1}</span>
              <s.icon size={28} className="text-ink/25" aria-hidden />
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.08em] text-ink/45">{s.when}</p>
            <h3 className="mt-1 text-2xl font-bold leading-snug text-ink">{s.title}</h3>
            <p className="mt-2 flex-1 text-base leading-relaxed text-ink/65">{s.body}</p>
            <span className="mt-5 self-start rounded-full bg-leaf/10 px-3 py-1 text-sm font-semibold text-leaf">{s.tag}</span>
            {i < HOW_IT_WORKS.length - 1 && (
              <span className="absolute -right-4 top-10 z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-ink/10 bg-[var(--paper)] text-ink/40 lg:flex" aria-hidden>
                <ArrowRight size={15} />
              </span>
            )}
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
