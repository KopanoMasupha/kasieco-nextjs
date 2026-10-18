"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import clsx from "clsx";
import { AlertTriangle, ArrowRight, Boxes, CheckCircle2, PackagePlus } from "lucide-react";
import { useStore } from "@/lib/store";
import { computeInsights } from "@/lib/ai/insights";
import { StockInsightStatus } from "@/lib/types";

/** Status colours — validated for colour-blind separation; always shown with an icon + label too. */
const STATUS: Record<StockInsightStatus, { color: string; label: string; icon: any; text: string; bg: string }> = {
  low: { color: "#E8590C", label: "Low", icon: AlertTriangle, text: "text-[#C2410C]", bg: "bg-[#E8590C]/10" },
  healthy: { color: "#2B9A66", label: "Healthy", icon: CheckCircle2, text: "text-[#1F7A50]", bg: "bg-[#2B9A66]/10" },
  overstock: { color: "#4C6EF5", label: "Too much", icon: PackagePlus, text: "text-[#3B5BDB]", bg: "bg-[#4C6EF5]/10" },
};
const ORDER: StockInsightStatus[] = ["low", "healthy", "overstock"];

const daysText = (d: number | null, qty: number) => (qty === 0 ? "sold out" : d === null ? "no sales yet" : d < 1 ? "under a day" : `${Math.round(d)} day${Math.round(d) === 1 ? "" : "s"}`);

const AXIS_DAYS = 30; // bars show how many days the stock lasts, capped at a month
const WEEK = (7 / AXIS_DAYS) * 100;

/** How long each item's stock lasts at its current sales pace. Left of the 1-week line = restock soon. */
export default function StockChart({ shopId, limit = 8 }: { shopId: string; limit?: number }) {
  const { state } = useStore();
  const [hover, setHover] = useState<number | null>(null);

  const rows = useMemo(() => {
    const ins = computeInsights(shopId, { shops: state.shops, goods: state.goods, listings: state.listings });
    // most urgent first: low → healthy → too much, then fewest days left
    return ins.sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || (a.daysOfCover ?? 999) - (b.daysOfCover ?? 999)).slice(0, limit);
  }, [shopId, state.shops, state.goods, state.listings, limit]);

  const all = useMemo(() => computeInsights(shopId, { shops: state.shops, goods: state.goods, listings: state.listings }), [shopId, state.shops, state.goods, state.listings]);
  const count = (s: StockInsightStatus) => all.filter((r) => r.status === s).length;
  const totalUnits = all.reduce((n, r) => n + r.stockQty, 0);

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-white">
            <Boxes size={20} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-ink">Stock</h2>
            <p className="num text-xs text-ink/50">
              {all.length} items · {totalUnits} units on the shelf
            </p>
          </div>
        </div>
        <Link href="/owner/stock" className="btn-dark px-3.5 py-2 text-xs">
          Manage <ArrowRight size={13} />
        </Link>
      </div>

      {/* status tiles */}
      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        {ORDER.map((s) => {
          const S = STATUS[s];
          return (
            <div key={s} className={clsx("rounded-xl px-3 py-2.5", S.bg)}>
              <p className={clsx("flex items-center gap-1 text-[11px] font-semibold sm:text-xs", S.text)}>
                <S.icon size={12} /> {S.label}
              </p>
              <p className="num font-display text-2xl font-bold text-ink">{count(s)}</p>
            </div>
          );
        })}
      </div>

      {/* bars */}
      {rows.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-ink/15 p-6 text-center text-sm text-ink/55">
          No items yet.{" "}
          <Link href="/owner/stock" className="font-semibold text-ember-dark underline">
            Add your stock
          </Link>
        </div>
      ) : (
        <div className="relative mt-5" role="table" aria-label="Stock per item">
          <ul className="space-y-1">
            {rows.map((r, i) => {
              const S = STATUS[r.status];
              const w = r.stockQty === 0 ? 0 : r.daysOfCover === null ? 100 : Math.min(100, (r.daysOfCover / AXIS_DAYS) * 100);
              const over = r.stockQty > 0 && (r.daysOfCover === null || r.daysOfCover > AXIS_DAYS);
              return (
                <li
                  key={r.goodId}
                  role="row"
                  tabIndex={0}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className={clsx("relative grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 rounded-lg px-2 py-2 outline-none transition-colors sm:grid-cols-[minmax(0,10rem)_1fr_auto]", hover === i && "bg-ink/[0.035]")}
                >
                  <span role="cell" className="truncate text-sm font-medium text-ink">
                    {r.name}
                  </span>
                  <span role="cell" className="relative order-3 col-span-2 h-2.5 rounded-full bg-ink/[0.05] sm:order-none sm:col-span-1">
                    <motion.span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ backgroundColor: S.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(r.stockQty ? 2 : 0, w)}%` }}
                      transition={{ duration: 0.7, delay: i * 0.05, ease: "easeOut" }}
                    />
                    {over && <span className="absolute -right-1 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[5px] border-l-[6px] border-y-transparent" style={{ borderLeftColor: S.color }} aria-hidden />}
                    <span className="absolute -inset-y-1.5 w-px border-l border-dashed border-ink/50" style={{ left: `${WEEK}%` }} aria-hidden />
                  </span>
                  <span role="cell" className="num text-right text-xs text-ink/60 sm:w-28">
                    {r.stockQty === 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#C2410C]">
                        <AlertTriangle size={12} /> Sold out
                      </span>
                    ) : (
                      <>
                        <strong className="text-sm text-ink">{r.stockQty}</strong> left · {daysText(r.daysOfCover, r.stockQty)}
                      </>
                    )}
                  </span>

                  {hover === i && (
                    <span className="pointer-events-none absolute left-2 top-full z-20 mt-1 w-56 rounded-xl bg-ink p-3 text-xs text-white shadow-lg sm:left-40">
                      <span className="block font-semibold">{r.name}</span>
                      <span className={clsx("mt-0.5 flex items-center gap-1 font-semibold")} style={{ color: S.color === "#4C6EF5" ? "#91A7FF" : S.color === "#2B9A66" ? "#63E6A4" : "#FFA94D" }}>
                        <S.icon size={11} /> {S.label}
                      </span>
                      <span className="num mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-white/75">
                        <span>On shelf</span>
                        <span className="text-right text-white">{r.stockQty}</span>
                        <span>Sold this week</span>
                        <span className="text-right text-white">{r.unitsSoldRecent}</span>
                        <span>Lasts</span>
                        <span className="text-right text-white">{daysText(r.daysOfCover, r.stockQty)}</span>
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {/* legend */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-ink/[0.06] pt-3 text-[11px] text-ink/55">
            {ORDER.map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: STATUS[s].color }} /> {STATUS[s].label}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-px border-l border-dashed border-ink/60" /> 1 week
            </span>
            <span className="text-ink/40">Bar = days the stock lasts (up to {AXIS_DAYS})</span>
          </div>
        </div>
      )}
    </section>
  );
}
