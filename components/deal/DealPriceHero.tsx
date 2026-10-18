"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { ArrowRight, Check, TrendingDown } from "lucide-react";
import { Pool } from "@/lib/types";
import { formatCents, toCents, totalQtyOf, unitCentsFor } from "@/lib/pot";

/**
 * The first thing an owner sees on a deal: what it costs alone vs. what they
 * pay together, the saving in rands and percent, and the price ladder showing
 * how close the deal is to the lowest price.
 */
export default function DealPriceHero({ pool, myQty }: { pool: Pool; myQty?: number }) {
  const unit = pool.unitLabel.split(" (")[0];
  const retail = toCents(pool.retailPrice);
  const final = unitCentsFor(pool, pool.minQty); // what everyone pays once it fills
  const saveEach = Math.max(0, retail - final);
  const pct = retail > 0 ? Math.round((saveEach / retail) * 100) : 0;
  const qty = totalQtyOf(pool);
  const tiers = [...pool.tiers].sort((a, b) => a.minQty - b.minQty);
  const prices = tiers.map((t) => toCents(t.price));
  const hi = Math.max(retail, ...prices);
  const lo = Math.min(...prices);
  const reachedIdx = tiers.reduce((i, t, j) => (qty >= t.minQty ? j : i), 0);
  const filled = pool.status !== "open";
  const left = Math.max(0, pool.minQty - qty);
  const nextTier = tiers.find((t) => t.minQty > qty);
  const barH = (c: number) => 40 + ((c - lo) / Math.max(1, hi - lo)) * 60; // 40–100%

  return (
    <section className="card overflow-hidden">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* the saving */}
        <div className="relative p-5 sm:p-6">
          <span className="inline-flex items-center gap-1 rounded-full bg-leaf px-3 py-1 text-sm font-bold text-white">
            <TrendingDown size={15} /> {pct}% off
          </span>
          <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-2">
            <div>
              <p className="text-xs font-medium text-ink/50">Buying alone</p>
              <p className="num font-display text-2xl font-bold text-ink/40 line-through decoration-2">{formatCents(retail)}</p>
            </div>
            <ArrowRight size={22} className="mb-2 hidden text-ink/25 sm:block" />
            <div>
              <p className="text-xs font-semibold text-leaf">{filled ? "Your price" : "Your price when it fills"}</p>
              <p className="num font-display text-5xl font-extrabold leading-none text-leaf">
                {formatCents(final)}
                <span className="ml-1 align-baseline text-base font-semibold text-ink/45">/ {unit}</span>
              </p>
            </div>
          </div>
          <p className="mt-4 rounded-xl bg-leaf/10 px-3.5 py-2.5 text-sm font-semibold text-leaf">
            You save {formatCents(saveEach)} on every {unit}
            {myQty ? <span className="font-normal text-leaf/80"> · {formatCents(saveEach * myQty)} on your {myQty}</span> : null}
          </p>
          <p className="mt-2 text-xs text-ink/50">Everyone in the deal pays the same lowest price. Delivery and the 2% fee are added at checkout.</p>
        </div>

        {/* the ladder */}
        <div className="border-t border-ink/[0.07] bg-sand-50 p-5 sm:p-6 lg:border-l lg:border-t-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-ink">Price drops as shops join</p>
            <p className="num text-xs text-ink/55">
              {qty} / {pool.minQty} reserved
            </p>
          </div>
          <div className="mt-4 flex h-36 items-end gap-1.5 sm:gap-2" role="list" aria-label="Price at each step">
            <Step label="Alone" price={retail} h={barH(retail)} tone="retail" />
            {tiers.map((t, i) => {
              const isFinal = i === tiers.length - 1;
              const reached = qty >= t.minQty;
              const current = i === reachedIdx && !filled;
              return <Step key={i} label={`${t.minQty}+`} price={prices[i]} h={barH(prices[i])} tone={isFinal ? "final" : reached ? "reached" : "todo"} current={current} />;
            })}
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink/[0.08]">
            <motion.div className="h-full rounded-full bg-ember" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (qty / pool.minQty) * 100)}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
          </div>
          <p className="mt-2 text-xs text-ink/60">
            {filled ? (
              <span className="flex items-center gap-1 font-semibold text-leaf">
                <Check size={13} /> Full — lowest price locked at {formatCents(final)}
              </span>
            ) : nextTier && nextTier.minQty < pool.minQty ? (
              <>
                <strong className="text-ink">{nextTier.minQty - qty} more</strong> to drop to {formatCents(toCents(nextTier.price))} · <strong className="text-ink">{left}</strong> to the lowest price
              </>
            ) : (
              <>
                <strong className="text-ink">{left} more</strong> to fill the deal at {formatCents(final)}
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

function Step({ label, price, h, tone, current }: { label: string; price: number; h: number; tone: "retail" | "reached" | "todo" | "final"; current?: boolean }) {
  return (
    <div role="listitem" className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
      <span className={clsx("num mb-1 truncate text-[11px] font-bold sm:text-xs", tone === "final" ? "text-leaf" : tone === "retail" ? "text-ink/35 line-through" : current ? "text-ember-dark" : "text-ink/60")}>
        {formatCents(price).replace(/\.\d+$/, "")}
      </span>
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: `${h}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={clsx(
          "w-full rounded-t-md",
          tone === "retail" && "bg-ink/10",
          tone === "reached" && "bg-ember/70",
          tone === "todo" && "bg-ink/[0.12]",
          tone === "final" && "bg-leaf",
          current && "ring-2 ring-ember ring-offset-2 ring-offset-sand-50"
        )}
      />
      <span className={clsx("mt-1 truncate text-[10px] sm:text-[11px]", tone === "final" ? "font-semibold text-leaf" : "text-ink/45")}>{tone === "final" ? "Full" : label}</span>
    </div>
  );
}
