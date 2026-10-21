"use client";

import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Users, Clock } from "lucide-react";
import { Pool, DEAL_STEPS } from "@/lib/types";
import { formatCents, toCents, totalQtyOf, memberPositions, unitCentsFor } from "@/lib/pot";
import ProductImage from "@/components/ProductImage";
import { dealBadges, itemsPerUnit, wholesalerRating } from "@/lib/products";
import { useStore } from "@/lib/store";
import { Star } from "lucide-react";

function closesIn(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "closed";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

/** A wholesaler deal as a card. `href` lets admins link to their control room instead. */
export default function PoolCard({ pool, myShopId, compact, href }: { pool: Pool; myShopId?: string; compact?: boolean; href?: string }) {
  const qty = totalQtyOf(pool);
  const best = unitCentsFor(pool, pool.minQty); // what everyone pays when it fills
  const retail = toCents(pool.retailPrice);
  const pct = retail > 0 ? Math.round(((retail - best) / retail) * 100) : 0;
  const mine = memberPositions(pool).find((m) => m.shopId === myShopId);
  const left = pool.minQty - qty;
  const step = DEAL_STEPS.find((s) => s.status === pool.status);
  const badges = dealBadges(pool);
  const { state } = useStore();
  const rating = wholesalerRating(state.pools, pool.wholesalerId);

  return (
    <Link href={href ?? `/owner/pools/${pool.id}`} className={clsx("card group flex items-start gap-3 overflow-hidden transition-shadow hover:shadow-lg", compact ? "p-3" : "p-4")}>
      <div className="relative shrink-0">
        <ProductImage name={pool.productName} src={pool.photo} count={itemsPerUnit(pool.unitLabel)} size={compact ? 56 : 68} />
        {pct > 0 && pool.status === "open" && (
          <span className="absolute -bottom-1 -left-1 rounded-full bg-leaf px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">−{pct}%</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
          <p className="text-sm font-semibold leading-snug text-ink">{pool.productName}</p>
          {mine && <span className="shrink-0 rounded-full bg-ember/10 px-2 py-0.5 text-[11px] font-semibold text-ember-dark">Joined · {mine.qty}</span>}
        </div>
        <p className="truncate text-xs text-ink/45">
          {rating && (
            <span className="mr-1 inline-flex items-center gap-0.5 font-semibold text-ink/70">
              <Star size={11} className="text-[#F2A93B]" fill="currentColor" strokeWidth={0} /> {rating.avg.toFixed(1)} ·
            </span>
          )}
          {pool.supplierName} · {pool.unitLabel}
        </p>
        {pool.status === "open" ? (
          <>
            <p className="mt-1 text-sm">
              <span className="num text-xs text-ink/40 line-through">{formatCents(retail)}</span>
              <span className="num ml-1 font-display text-base font-bold text-leaf">{formatCents(best)}</span>
            </p>
            <div className="flex flex-wrap gap-1 mt-1">
              {badges.map((b) => (
                <span key={b.label} className={clsx("rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white", b.tone === "ember" ? "bg-ember" : b.tone === "leaf" ? "bg-leaf" : "bg-ink")}>
                  {b.label}
                </span>
              ))}
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/5">
              <div className="h-full rounded-full bg-ember transition-all" style={{ width: `${Math.min(100, (qty / pool.minQty) * 100)}%` }} />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-ink/45">
              <span className="flex items-center gap-1">
                <Users size={11} /> {pool.commitments.length} in · <span className={clsx(left / pool.minQty <= 0.35 && "font-semibold text-ember-dark")}>{left} left</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock size={11} /> {closesIn(pool.closesAt)}
              </span>
            </p>
          </>
        ) : (
          <p className="mt-1.5 inline-flex rounded-full bg-ink/5 px-2.5 py-1 text-xs font-semibold text-ink/70">{pool.status === "cancelled" ? "Cancelled · refunded" : step?.label}</p>
        )}
      </div>
      <ArrowRight size={16} className="mt-1 shrink-0 text-ink/25 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
