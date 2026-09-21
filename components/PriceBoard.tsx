"use client";

import { Pool } from "@/lib/types";
import { currentTier, nextTier, totalQty, unitsToNextTier, formatRand } from "@/lib/pricing";
import { TrendingDown } from "lucide-react";

export default function PriceBoard({ pool, compact }: { pool: Pool; compact?: boolean }) {
  const qty = totalQty(pool);
  const cur = currentTier(pool);
  const nxt = nextTier(pool);
  const base = pool.tiers[0]?.price ?? cur.price;
  const saved = base - cur.price;
  const sorted = [...pool.tiers].sort((a, b) => a.minQty - b.minQty);

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
            Price right now
          </p>
          <p className="text-3xl font-extrabold text-ink">
            {formatRand(cur.price)}
            <span className="ml-1 text-sm font-medium text-ink/40">/ {pool.unitLabel}</span>
          </p>
        </div>
        {saved > 0 && (
          <span className="mb-1 flex items-center gap-1 rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-semibold text-leaf">
            <TrendingDown size={13} />
            {formatRand(saved)} down from {formatRand(base)}
          </span>
        )}
      </div>

      {!compact && (
        <div className="mt-4 flex gap-1.5">
          {sorted.map((t, i) => {
            const active = t.price === cur.price;
            return (
              <div
                key={i}
                className={`flex-1 rounded-xl border px-2 py-2 text-center ${
                  active ? "border-ember bg-ember/5" : "border-ink/10"
                }`}
              >
                <p className={`text-[13px] font-bold ${active ? "text-ember-dark" : "text-ink/70"}`}>
                  {formatRand(t.price)}
                </p>
                <p className="text-[10px] text-ink/40">{t.minQty}+ {pool.unitLabel}s</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-ink/50">
          <span>{qty} {pool.unitLabel}s pooled</span>
          {nxt ? (
            <span>
              {unitsToNextTier(pool)} more to {formatRand(nxt.price)}
            </span>
          ) : (
            <span>Lowest price unlocked</span>
          )}
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-sand-100">
          <div
            className="h-full rounded-full bg-ember transition-all"
            style={{
              width: `${
                nxt ? Math.min(100, (qty / nxt.minQty) * 100) : 100
              }%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
