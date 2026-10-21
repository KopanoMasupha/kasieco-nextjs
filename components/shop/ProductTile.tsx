"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Check, ShoppingBag, Star } from "lucide-react";
import { Pool } from "@/lib/types";
import { useStore } from "@/lib/store";
import { formatCents, toCents, totalQtyOf, unitCentsFor } from "@/lib/pot";
import { dealBadges, itemsPerUnit, popularQty, wholesalerRating } from "@/lib/products";
import { unitsLeft, useCart } from "@/lib/cart";
import ProductImage from "@/components/ProductImage";
import QtyStepper from "./QtyStepper";

function closesIn(iso: string, now: number | null) {
  if (now === null) return "—";
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "closed";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
}

export default function ProductTile({ pool, canBuy }: { pool: Pool; canBuy: boolean }) {
  const { state } = useStore();
  const cart = useCart();
  const [now, setNow] = useState<number | null>(null);
  const final = unitCentsFor(pool, pool.minQty);
  const retail = toCents(pool.retailPrice);
  const pct = retail > 0 ? Math.round(((retail - final) / retail) * 100) : 0;
  const qty = totalQtyOf(pool);
  const left = unitsLeft(pool);
  const inCart = cart.qtyOf(pool.id);
  const rating = wholesalerRating(state.pools, pool.wholesalerId);
  const badges = dealBadges(pool, now ?? Date.parse(pool.createdAt));
  const badge = badges.find((item) => item.label !== "New") ?? badges[0];
  const unit = pool.unitLabel.split(" (")[0];
  const per = itemsPerUnit(pool.unitLabel);
  const addQty = Math.max(1, Math.min(left, popularQty(pool) ?? 1));

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const id = window.setInterval(update, 60000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <article className="group flex min-w-0 flex-col">
      <Link
        href={`/owner/pools/${pool.id}`}
        className="relative block overflow-hidden rounded-2xl bg-[#EFEDEA] transition-colors hover:bg-[#E9E6E1]"
        aria-label={`${pool.productName}, ${formatCents(final)} per ${unit}`}
      >
        <ProductImage name={pool.productName} src={pool.photo} count={per} size="fill" rounded="rounded-none" className="transition-transform duration-300 group-hover:scale-[1.03]" />
        {pct > 0 && <span className="absolute left-3 top-3 rounded-full bg-leaf px-2 py-0.5 text-xs font-bold text-white">−{pct}%</span>}
        {badge && (
          <span className={clsx("absolute bottom-3 left-3 rounded-full px-2 py-0.5 text-[11px] font-bold text-white", badge.tone === "ember" ? "bg-ember" : badge.tone === "leaf" ? "bg-leaf" : "bg-ink")}>
            {badge.label}
          </span>
        )}
        {inCart > 0 && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-ink px-2 py-1 text-[11px] font-bold text-white">
            <Check size={12} /> {inCart} in cart
          </span>
        )}
      </Link>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="num font-display text-xl font-bold text-ink">{formatCents(final)}</span>
        <span className="num text-sm text-ink/40 line-through">{formatCents(retail)}</span>
      </div>
      <Link href={`/owner/pools/${pool.id}`} className="truncate text-[15px] font-medium text-ink hover:underline">
        {pool.productName}
      </Link>
      <p className="truncate text-xs text-ink/50">
        {rating && (
          <span className="mr-1 inline-flex items-center gap-0.5 font-semibold text-ink/70">
            <Star size={11} className="text-[#F2A93B]" fill="currentColor" strokeWidth={0} /> {rating.avg.toFixed(1)} ·
          </span>
        )}
        {pool.supplierName} · per {unit}{per > 1 ? ` of ${per}` : ""}
      </p>

      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.08]" aria-hidden>
        <div className="h-full rounded-full bg-ember" style={{ width: `${Math.min(100, (qty / pool.minQty) * 100)}%` }} />
      </div>
      <p className="mt-1 flex justify-between text-[11px] text-ink/50">
        <span className={clsx(left / pool.minQty <= 0.35 && "font-semibold text-ember-dark")}>{left} left</span>
        <span>{closesIn(pool.closesAt, now)}</span>
      </p>

      {inCart > 0 ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <QtyStepper size="sm" value={inCart} min={1} max={Math.max(1, left)} onChange={(n) => cart.setQty(pool.id, n)} label={`${pool.productName} in cart`} />
          <Link href="/owner/cart" className="btn-outline px-3 py-2 text-sm">
            <ShoppingBag size={14} /> Cart
          </Link>
        </div>
      ) : (
        <button type="button" disabled={!canBuy || left === 0} onClick={() => cart.add(pool.id, addQty)} className="btn-dark mt-3 w-full py-2.5 text-sm">
          <ShoppingBag size={15} /> Add {addQty} to cart
        </button>
      )}
    </article>
  );
}
