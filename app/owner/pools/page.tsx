"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import PriceBoard from "@/components/PriceBoard";
import { isVerified, statusLabel } from "@/lib/compliance";
import { currentTier, totalQty } from "@/lib/pricing";
import { BadgeCheck, Loader2, Store, ArrowRight, ShieldAlert } from "lucide-react";

export default function PoolsPage() {
  const { state, dispatch } = useStore();
  const shop = state.shops.find((s) => s.id === state.myShopId);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [qty, setQty] = useState(5);
  const [paying, setPaying] = useState(false);

  if (!shop) {
    return (
      <div className="mx-auto max-w-md py-14 text-center">
        <Store size={30} className="mx-auto text-ink/25" />
        <h1 className="mt-3 text-lg font-semibold text-ink">Register your shop first</h1>
        <Link href="/owner/register" className="btn-dark mt-5 inline-flex px-5 py-3 text-sm">
          Register my shop
        </Link>
      </div>
    );
  }

  function join(poolId: string) {
    setPaying(true);
    setTimeout(async () => {
      await dispatch({
        type: "JOIN_POOL",
        poolId,
        shopId: shop!.id,
        shopName: shop!.name,
        township: shop!.township,
        qty,
      });
      setPaying(false);
      setJoiningId(null);
      setQty(5);
    }, 1200);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink">Bulk buying pools</h1>
        <p className="text-sm text-ink/50">
          Join with other kasi shops. The more units pooled, the lower the price for
          everyone.
        </p>
      </div>

      {!isVerified(shop) && (
        <div className="card flex items-center gap-3 border-ember/30 bg-ember/5 p-4 text-sm">
          <ShieldAlert size={18} className="shrink-0 text-ember" />
          <p className="text-ink/70">
            {shop.name} is <strong>{statusLabel(shop.verificationStatus)}</strong>. Get
            verified to join a pool.{" "}
            <Link href="/owner/compliance" className="font-semibold text-ember-dark underline">
              Go to compliance
            </Link>
          </p>
        </div>
      )}

      {state.pools.map((pool) => {
        const mine = pool.commitments.find((c) => c.shopId === shop.id);
        return (
          <div key={pool.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-ink">{pool.productName}</h2>
                <p className="flex items-center gap-1 text-xs font-medium text-leaf">
                  <BadgeCheck size={13} /> {pool.supplierName}
                </p>
              </div>
              <Link href={`/owner/pools/${pool.id}`} className="text-xs font-semibold text-ember-dark">
                Details <ArrowRight size={12} className="inline" />
              </Link>
            </div>

            <div className="mt-4">
              <PriceBoard pool={pool} />
            </div>

            {mine ? (
              <div className="mt-4 rounded-xl bg-leaf/10 px-4 py-2.5 text-sm font-medium text-leaf">
                You're in with {mine.qty} {pool.unitLabel}s
              </div>
            ) : joiningId === pool.id ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl2 border border-ink/10 p-3">
                <label className="text-sm text-ink/60">How many {pool.unitLabel}s?</label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                  className="input w-20 py-1.5"
                />
                <div className="ml-auto flex gap-2">
                  <button onClick={() => setJoiningId(null)} className="btn-outline px-3 py-2 text-xs">
                    Cancel
                  </button>
                  <button
                    disabled={paying}
                    onClick={() => join(pool.id)}
                    className="btn-ember px-3.5 py-2 text-xs"
                  >
                    {paying ? <Loader2 size={13} className="animate-spin" /> : "Pay & join (sandbox)"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                disabled={!isVerified(shop)}
                onClick={() => setJoiningId(pool.id)}
                className="btn-dark mt-4 w-full py-2.5 text-sm"
              >
                Join this pool
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
