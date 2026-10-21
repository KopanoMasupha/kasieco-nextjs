"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { useCart, lineEstimate, unitsLeft } from "@/lib/cart";
import { useStore } from "@/lib/store";
import QtyStepper from "@/components/shop/QtyStepper";
import { formatCents } from "@/lib/pot";

export default function CartPage() {
  const { items, setQty, remove } = useCart();
  const { state } = useStore();
  const pools = state.pools;

  const total = items.reduce((sum, i) => {
    const pool = pools.find(p => p.id === i.dealId);
    if (!pool) return sum;
    const qty = Math.min(i.qty, unitsLeft(pool));
    if (!qty) return sum;
    const est = lineEstimate(pool, qty);
    return sum + est.totalCents;
  }, 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-ink">Your cart</h1>
      {items.length === 0 ? (
        <div className="card p-6 text-sm text-ink/50">
          No deals in cart yet.{' '}
          <Link href="/owner/pools" className="font-semibold text-ember-dark">
            Start browsing deals
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((i) => {
            const pool = pools.find(p => p.id === i.dealId);
            if (!pool) return null;
            const remaining = unitsLeft(pool);
            const qty = Math.min(i.qty, remaining);
            return (
              <li key={i.dealId} className="flex items-center gap-4 border-b pb-2">
                <div className="flex-1">
                  <h2 className="font-semibold text-ink">{pool.productName}</h2>
                  <p className="text-sm text-ink/60">{remaining ? `${pool.retailPrice} per unit` : "This deal is no longer open"}</p>
                </div>
                {remaining > 0 && <QtyStepper value={qty} onChange={(n) => setQty(i.dealId, n)} min={1} max={remaining} />}
                <div className="w-24 text-right font-medium text-ink">{qty > 0 ? formatCents(lineEstimate(pool, qty).totalCents) : "—"}</div>
                <button
                  onClick={() => remove(i.dealId)}
                  className="text-ember hover:underline"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex justify-between text-xl font-bold">
        <span>Total:</span>
        <span>{formatCents(total)}</span>
      </div>
      <div className="flex gap-4">
        <Link href="/owner/payments" className="btn-ember px-4 py-2.5 text-sm">
          <Wallet size={15} /> Go to payments
        </Link>
        <button disabled title="Cart reservations are not available yet" className="btn-outline px-4 py-2.5 text-sm">Reserve all · coming soon</button>
      </div>
    </div>
  );
}