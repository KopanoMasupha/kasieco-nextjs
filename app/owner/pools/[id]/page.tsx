"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { useStore } from "@/lib/store";
import PriceBoard from "@/components/PriceBoard";
import { totalQty, currentTier, formatRand, rebateFor } from "@/lib/pricing";
import { CheckCircle2, MapPin, Truck, BadgeCheck } from "lucide-react";
import clsx from "clsx";

export default function PoolDetailPage({ params }: { params: { id: string } }) {
  const { state, dispatch } = useStore();
  const pool = state.pools.find((p) => p.id === params.id);
  const shop = state.shops.find((s) => s.id === state.myShopId);
  const [deliveredCount, setDeliveredCount] = useState(0);

  useEffect(() => {
    if (pool?.status !== "delivering") return;
    if (deliveredCount >= pool.commitments.length) {
      const t = setTimeout(() => dispatch({ type: "SET_POOL_STATUS", poolId: pool.id, status: "delivered" }), 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setDeliveredCount((c) => c + 1), 1300);
    return () => clearTimeout(t);
  }, [pool?.status, deliveredCount, pool, dispatch]);

  if (!pool) return notFound();

  const qty = totalQty(pool);
  const reached = qty >= pool.minQty;
  const mine = pool.commitments.find((c) => c.shopId === shop?.id);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink">{pool.productName}</h1>
        <p className="flex items-center gap-1 text-sm font-medium text-leaf">
          <BadgeCheck size={14} /> {pool.supplierName} · Verified supplier
        </p>
      </div>

      <div className="card p-5">
        <PriceBoard pool={pool} />
        <div className="mt-4 flex items-center justify-between rounded-xl bg-sand-50 px-4 py-2.5 text-sm">
          <span className="text-ink/60">Minimum to place the order</span>
          <span className={clsx("font-semibold", reached ? "text-leaf" : "text-ink/60")}>
            {qty} / {pool.minQty} {pool.unitLabel}s {reached && "· reached"}
          </span>
        </div>
        {mine && (
          <p className="mt-3 text-xs text-ink/45">
            You paid at {formatRand(currentTier(pool).price + rebateFor(pool, currentTier(pool).price))} — your
            current rebate is {formatRand(rebateFor(pool, currentTier(pool).price))} if the price has moved since
            you joined.
          </p>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-ink">Who's in this pool</h2>
        <div className="mt-3 space-y-2">
          {pool.commitments.map((c) => (
            <div key={c.shopId} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-ink/70">
                <MapPin size={13} className="text-ink/30" /> {c.shopName}
              </span>
              <span className="text-ink/45">
                {c.qty} {pool.unitLabel}s · {c.township}
              </span>
            </div>
          ))}
        </div>
      </div>

      {reached && pool.status === "open" && shop && (
        <button
          onClick={() => dispatch({ type: "SET_POOL_STATUS", poolId: pool.id, status: "delivering" })}
          className="btn-ember w-full py-3 text-sm"
        >
          Close pool & start delivery
        </button>
      )}

      {(pool.status === "delivering" || pool.status === "delivered") && (
        <div className="card p-5">
          <h2 className="flex items-center gap-2 font-semibold text-ink">
            <Truck size={16} className="text-ember" /> Delivery tracking
          </h2>
          <div className="mt-4 space-y-3">
            {pool.commitments.map((c, i) => {
              const arrived = i < deliveredCount || pool.status === "delivered";
              return (
                <div key={c.shopId} className="flex items-center gap-3">
                  <div
                    className={clsx(
                      "flex h-7 w-7 items-center justify-center rounded-full",
                      arrived ? "bg-leaf text-white" : "bg-sand-100 text-ink/30"
                    )}
                  >
                    {arrived ? <CheckCircle2 size={15} /> : i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">{c.shopName}</p>
                    <p className="text-xs text-ink/40">{c.township}</p>
                  </div>
                  <span className={clsx("text-xs font-medium", arrived ? "text-leaf" : "text-ink/40")}>
                    {arrived ? "Delivered" : "En route"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
