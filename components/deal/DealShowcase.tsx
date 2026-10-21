"use client";

import clsx from "clsx";
import { BadgeCheck, Check, Lock, ShieldCheck, Truck, Coins } from "lucide-react";
import { Pool } from "@/lib/types";
import { useStore } from "@/lib/store";
import { isVerified } from "@/lib/compliance";
import { formatCents } from "@/lib/pot";
import { dealBadges, itemsPerUnit, packFacts, resaleProfit, splitSize, wholesalerRating } from "@/lib/products";
import Stars from "@/components/shop/Stars";
import ProductImage from "@/components/ProductImage";

/**
 * The product, the way a good online store shows it: a clear picture, what's
 * in the pack, what the owner can earn reselling it, and why it's safe to buy.
 */
export default function DealShowcase({ pool }: { pool: Pool }) {
  const { state } = useStore();
  const verified = new Set(state.shops.filter(isVerified).map((s) => s.id));
  const profit = resaleProfit(pool, state.goods, verified);
  const per = itemsPerUnit(pool.unitLabel);
  const unit = pool.unitLabel.split(" (")[0];
  const item = splitSize(pool.productName);
  const badges = dealBadges(pool);
  const rating = wholesalerRating(state.pools, pool.wholesalerId);

  return (
    <section className="card overflow-hidden" data-tour="deal-showcase">
      <div className="grid gap-0 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <div className="relative bg-sand-50 p-4 sm:p-5">
          <ProductImage name={pool.productName} src={pool.photo} count={per} size="fill" className="mx-auto max-w-[200px] sm:max-w-none" />
          {badges.length > 0 && (
            <div className="absolute left-4 top-4 flex flex-col items-start gap-1 sm:left-7 sm:top-7">
              {badges.map((b) => (
                <span
                  key={b.label}
                  className={clsx(
                    "rounded-full px-2 py-0.5 text-[11px] font-bold shadow-sm",
                    b.tone === "ember" && "bg-ember text-white",
                    b.tone === "leaf" && "bg-leaf text-white",
                    b.tone === "ink" && "bg-ink text-white"
                  )}
                >
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 p-5 sm:p-6">
          <h1 className="text-2xl font-bold leading-tight text-ink sm:text-3xl">{pool.productName}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/55">
            <span className="flex items-center gap-1 font-medium text-leaf">
              <BadgeCheck size={14} /> {pool.supplierName}
            </span>
            <span>
              Sold per {unit}
              {per > 1 && item.size ? ` of ${per} × ${item.size}` : ""}
            </span>
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm">
            {rating ? (
              <>
                <Stars value={rating.avg} />
                <span className="num font-semibold text-ink">{rating.avg.toFixed(1)}</span>
                <span className="text-ink/50">
                  · {rating.count} rating{rating.count === 1 ? "" : "s"} from shops that received {pool.supplierName}'s stock
                </span>
              </>
            ) : (
              <span className="rounded-full bg-leaf/10 px-2 py-0.5 text-xs font-semibold text-leaf">New partner wholesaler · no ratings yet</span>
            )}
          </p>

          <p className="eyebrow mt-4">What you get</p>
          <ul className="mt-1.5 space-y-1 text-sm text-ink/75">
            {packFacts(pool).map((f) => (
              <li key={f} className="flex gap-2">
                <Check size={15} className="mt-0.5 shrink-0 text-leaf" /> {f}
              </li>
            ))}
          </ul>

          {profit && (
            <div className="mt-4 flex items-start gap-3 rounded-xl2 border border-leaf/20 bg-leaf/[0.06] p-3.5">
              <Coins size={18} className="mt-0.5 shrink-0 text-leaf" />
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-ink">
                  About <span className="num text-leaf">{formatCents(profit.profitCents)}</span> profit on every {unit}
                </p>
                <p className="mt-0.5 text-xs text-ink/55">
                  Sell each {per > 1 ? "one" : unit} at <span className="num">{formatCents(profit.shelfCents)}</span>, the average price verified kasi shops charge. That's {profit.marginPct}% after stock, delivery and the fee.
                </p>
              </div>
            </div>
          )}

          {rating && rating.recent.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {rating.recent.slice(0, 2).map((r) => (
                <figure key={r.shopId + r.at} className="rounded-xl2 bg-sand-50 p-3 text-xs">
                  <Stars value={r.stars} size={11} />
                  <blockquote className="mt-1 text-ink/75">“{r.comment}”</blockquote>
                  <figcaption className="mt-1 text-ink/40">
                    A shop in {r.township} · {r.productName}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-ink/60 lg:grid-cols-4">
            <Trust icon={<Lock size={13} />} text="Free to reserve" />
            <Trust icon={<ShieldCheck size={13} className="text-[#0B3D3A]" />} text="Money held by TradeSafe" />
            <Trust icon={<Truck size={13} />} text="Delivered to your shop" />
            <Trust icon={<BadgeCheck size={13} className="text-leaf" />} text="Verified shops only" />
          </ul>
        </div>
      </div>
    </section>
  );
}

function Trust({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink/[0.05] text-ink/60">{icon}</span>
      {text}
    </li>
  );
}
