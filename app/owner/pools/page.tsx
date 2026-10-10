"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import PriceBoard from "@/components/PriceBoard";
import { isVerified, statusLabel } from "@/lib/compliance";
import { formatRand, totalQty } from "@/lib/pricing";
import { quoteJoin, rand } from "@/lib/pot";
import { PotPaymentMethod } from "@/lib/types";
import { WHOLESALE_CATALOGUE } from "@/lib/wholesalers";
import { BadgeCheck, Loader2, Store, ArrowRight, ShieldAlert } from "lucide-react";

const METHODS: { id: PotPaymentMethod; label: string }[] = [
  { id: "instant-eft", label: "Instant EFT" },
  { id: "bank-card", label: "Bank card" },
  { id: "wallet", label: "KasiEco wallet" },
];

export default function PoolsPage() {
  const { state, dispatch } = useStore();
  const shop = state.shops.find((s) => s.id === state.myShopId);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [qty, setQty] = useState(5);
  const [method, setMethod] = useState<PotPaymentMethod>("instant-eft");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

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

  async function join(poolId: string) {
    if (!shop) return;
    const pool = state.pools.find((item) => item.id === poolId);
    if (!pool) return;
    const quote = quoteJoin(pool, {
      shopId: shop.id,
      shopName: shop.name,
      township: shop.township,
      qty,
      paid: true,
      joinedAt: new Date().toISOString(),
    });
    setPaying(true);
    setError("");
    await new Promise((resolve) => setTimeout(resolve, 650));
    const result = await dispatch({
      type: "JOIN_POOL",
      poolId,
      shopId: shop.id,
      qty,
      method,
      expectedCents: quote.paymentCents,
    });
    setPaying(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setJoiningId(null);
    setQty(5);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Bulk buying pools</h1>
          <p className="text-sm text-ink/50">
            Pay your share into the sandbox pot. As more shops join, the price can only come down.
          </p>
        </div>
        <Link href="/owner/pools/new" className="btn-ember px-4 py-2.5 text-sm">
          Start a pot
        </Link>
      </div>

      {!isVerified(shop) && (
        <div className="card flex items-center gap-3 border-ember/30 bg-ember/5 p-4 text-sm">
          <ShieldAlert size={18} className="shrink-0 text-ember" />
          <p className="text-ink/70">
            {shop.name} is <strong>{statusLabel(shop.verificationStatus)}</strong>. Get verified to pay into a pot.{" "}
            <Link href="/owner/compliance" className="font-semibold text-ember-dark underline">
              Go to compliance
            </Link>
          </p>
        </div>
      )}

      {error && <p role="alert" className="card border-red-200 p-3 text-sm text-red-700">{error}</p>}
      {state.pools.map((pool) => {
        const mine = pool.commitments.find((c) => c.shopId === shop.id);
        const open = pool.status === "open";
        const quote = !mine && open && qty > 0
          ? quoteJoin(pool, { shopId: shop.id, shopName: shop.name, township: shop.township, qty, paid: true, joinedAt: "" })
          : null;
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
            <div className="mt-4"><PriceBoard pool={pool} /></div>
            <p className="mt-3 text-xs text-ink/45">
              Pot balance: {rand(pool.balanceCents ?? 0)} · {totalQty(pool)} units pledged · {pool.status}
            </p>

            {mine ? (
              <div className="mt-4 rounded-xl bg-leaf/10 px-4 py-2.5 text-sm font-medium text-leaf">
                You're in with {mine.qty} {pool.unitLabel}s · {rand(mine.paidCents ?? 0)} paid
              </div>
            ) : joiningId === pool.id ? (
              <div className="mt-4 space-y-3 rounded-xl border border-ink/10 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-sm text-ink/60" htmlFor={`qty-${pool.id}`}>Units to join with</label>
                  <input
                    id={`qty-${pool.id}`}
                    type="number"
                    min={1}
                    max={1000}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="input w-24 py-1.5"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {METHODS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setMethod(option.id)}
                      className={method === option.id ? "btn-dark py-2 text-xs" : "btn-outline py-2 text-xs"}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {quote && (
                  <div className="rounded-lg bg-sand-50 p-3 text-xs text-ink/70">
                    <p className="font-semibold">Sandbox payment preview · {rand(quote.paymentCents)}</p>
                    <p>Goods {rand(quote.shares.find((share) => share.shopId === shop.id)!.goodsCents)} · delivery {rand(quote.shares.find((share) => share.shopId === shop.id)!.deliveryCents)} · 2% fee {rand(quote.shares.find((share) => share.shopId === shop.id)!.feeCents)}</p>
                    <p>Unit price after joining: {formatRand(quote.unitPriceCents / 100)}</p>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setJoiningId(null); setError(""); }} className="btn-outline px-3 py-2 text-xs">
                    Cancel
                  </button>
                  <button disabled={paying || !isVerified(shop)} onClick={() => join(pool.id)} className="btn-ember px-3.5 py-2 text-xs">
                    {paying ? <><Loader2 size={13} className="animate-spin" /> Sending payment…</> : `Pay ${quote ? rand(quote.paymentCents) : ""}`}
                  </button>
                </div>
                {paying && <p role="status" className="text-xs text-ink/50">Sending · sandbox gateway confirmed · recording in pot ledger…</p>}
              </div>
            ) : open && !mine ? (
              <button
                disabled={!isVerified(shop)}
                onClick={() => { setJoiningId(pool.id); setError(""); }}
                className="btn-dark mt-4 w-full py-2.5 text-sm"
              >
                Pay & join
              </button>
            ) : null}
          </div>
        );
      })}
      {state.pools.length === 0 && <p className="card p-6 text-center text-sm text-ink/50">No open pots yet. Start one from the wholesaler catalogue.</p>}
    </div>
  );
}
