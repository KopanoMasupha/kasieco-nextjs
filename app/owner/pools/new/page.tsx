"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { isVerified } from "@/lib/compliance";
import { WHOLESALE_CATALOGUE } from "@/lib/wholesalers";
import { Pool, PotPaymentMethod } from "@/lib/types";
import { quoteJoin, rand } from "@/lib/pot";
import { ArrowLeft, Store } from "lucide-react";

export default function NewPoolPage() {
  const { state, dispatch } = useStore();
  const router = useRouter();
  const shop = state.shops.find((item) => item.id === state.myShopId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [qty, setQty] = useState(5);
  const [method, setMethod] = useState<PotPaymentMethod>("instant-eft");

  if (!shop) {
    return <div className="card p-6 text-center"><Store className="mx-auto" /><p className="mt-2">Register your shop first.</p></div>;
  }

  async function start(productId: string) {
    if (!shop) return;
    setBusy(true);
    setError("");
    try {
      const product = WHOLESALE_CATALOGUE.find((item) => item.id === productId)!;
      const previewPool: Pool = {
        ...product,
        id: "preview",
        supplierVerified: true,
        commitments: [],
        closesAt: "",
        status: "open",
      };
      const quote = quoteJoin(previewPool, {
        shopId: shop.id,
        shopName: shop.name,
        township: shop.township,
        qty,
        paid: true,
        joinedAt: "",
      });
      const created = await dispatch({ type: "CREATE_POOL", shopId: shop.id, productId });
      if (created.error) {
        setError(created.error);
        return;
      }
      const paid = await dispatch({
        type: "JOIN_POOL",
        poolId: created.poolId,
        shopId: shop.id,
        qty,
        method,
        expectedCents: quote.paymentCents,
      });
      if (paid.error) {
        setError(`The pot was created, but the first payment failed: ${paid.error}`);
        router.push(`/owner/pools/${created.poolId}`);
        return;
      }
      router.push(`/owner/pools/${created.poolId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/owner/pools" className="inline-flex items-center gap-1 text-sm text-ink/55"><ArrowLeft size={14} /> Bulk buy</Link>
      <div>
        <h1 className="text-xl font-bold text-ink">Start a pot</h1>
        <p className="mt-1 text-sm text-ink/50">Choose a catalogue product. Your pot opens when you make its first sandbox payment.</p>
      </div>
      {!isVerified(shop) && <p className="card border-ember/30 p-4 text-sm">Your shop must be verified before you can start a pot.</p>}
      {error && <p role="alert" className="card border-red-200 p-3 text-sm text-red-700">{error}</p>}
      <div className="card grid gap-3 p-4 sm:grid-cols-2">
        <label className="text-sm text-ink/65">Your starting units
          <input type="number" min={1} max={1000} value={qty} onChange={(event) => setQty(Math.max(1, parseInt(event.target.value, 10) || 1))} className="input mt-1" />
        </label>
        <label className="text-sm text-ink/65">Sandbox payment method
          <select value={method} onChange={(event) => setMethod(event.target.value as PotPaymentMethod)} className="input mt-1">
            <option value="instant-eft">Instant EFT</option>
            <option value="bank-card">Bank card</option>
            <option value="wallet">KasiEco wallet</option>
          </select>
        </label>
      </div>
      <div className="space-y-3">
        {WHOLESALE_CATALOGUE.map((product) => (
          <article key={product.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-ink">{product.productName}</h2>
                <p className="text-xs text-ink/45">{product.supplierName} · minimum {product.minQty} {product.unitLabel}s · delivery {`R${(product.deliveryCents / 100).toFixed(2)}`}</p>
              </div>
              <button disabled={busy || !isVerified(shop)} onClick={() => start(product.id)} className="btn-ember px-4 py-2.5 text-sm">
              {busy ? "Creating pot & simulating payment…" : "Start pot & pay"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.tiers.map((tier) => (
                <span key={tier.minQty} className="rounded-full bg-sand-50 px-3 py-1 text-xs text-ink/65">
                  {tier.minQty}+ units · R{tier.price.toFixed(2)}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
