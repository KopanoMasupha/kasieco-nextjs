"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { isVerified, statusLabel, STATUS_STYLE } from "@/lib/compliance";
import AiInsights from "@/components/AiInsights";
import {
  ClipboardList,
  Boxes,
  Users,
  Repeat,
  ArrowRight,
  AlertTriangle,
  Store,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { totalQty, currentTier } from "@/lib/pricing";
import clsx from "clsx";

export default function OwnerDashboard() {
  const { state } = useStore();
  const shop = state.shops.find((s) => s.id === state.myShopId);

  if (!shop) {
    return (
      <div className="mx-auto max-w-md py-14 text-center">
        <Store size={30} className="mx-auto text-ink/25" />
        <h1 className="mt-3 text-lg font-semibold text-ink">Register your shop first</h1>
        <p className="mt-1 text-sm text-ink/50">
          Once you're registered, customers can find you on the map.
        </p>
        <Link href="/owner/register" className="btn-dark mt-5 inline-flex px-5 py-3 text-sm">
          Register my shop
        </Link>
      </div>
    );
  }

  const myOrders = state.orders.filter((o) => o.shopId === shop.id);
  const pendingOrders = myOrders.filter((o) => o.status === "placed" || o.status === "accepted");
  const myGoods = state.goods.filter((g) => g.shopId === shop.id);
  const lowStock = myGoods.filter((g) => !g.hidden && g.stockQty > 0 && g.stockQty <= 5);
  const outOfStock = myGoods.filter((g) => !g.hidden && g.stockQty === 0);
  const myPools = state.pools.filter((p) => p.commitments.some((c) => c.shopId === shop.id));

  const myListings = state.listings.filter((l) => l.shopId === shop.id && l.status === "open");
  const matchCount = myListings.reduce((n, l) => {
    const opposite = l.type === "have" ? "need" : "have";
    return (
      n +
      state.listings.filter(
        (o) =>
          o.shopId !== shop.id &&
          o.status === "open" &&
          o.type === opposite &&
          o.item === l.item
      ).length
    );
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ember-dark">
          {shop.township}
        </p>
        <h1 className="text-xl font-bold text-ink">{shop.name}</h1>
        <p className="text-sm text-ink/50">Here's what's happening with your shop today.</p>
      </div>

      <Link
        href="/owner/compliance"
        className={clsx(
          "card flex items-center justify-between gap-3 p-4 transition-shadow hover:shadow-md",
          !isVerified(shop) && "border-ember/30"
        )}
      >
        <div className="flex items-center gap-3">
          {isVerified(shop) ? (
            <ShieldCheck size={18} className="text-leaf" />
          ) : (
            <ShieldAlert size={18} className="text-ember" />
          )}
          <div>
            <p className="text-sm font-semibold text-ink">Compliance status</p>
            <p className="text-xs text-ink/45">
              {isVerified(shop) ? "You're verified — customers can find you and you can trade." : "Complete verification to go live."}
            </p>
          </div>
        </div>
        <span className={clsx("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLE[shop.verificationStatus])}>
          {statusLabel(shop.verificationStatus)}
        </span>
      </Link>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/owner/orders" className="card p-5 transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <ClipboardList size={18} className="text-ember-dark" />
            <ArrowRight size={14} className="text-ink/25" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-ink">{pendingOrders.length}</p>
          <p className="text-xs text-ink/50">Orders need action</p>
        </Link>

        <Link href="/owner/goods" className="card p-5 transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <Boxes size={18} className="text-leaf" />
            <ArrowRight size={14} className="text-ink/25" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-ink">{lowStock.length + outOfStock.length}</p>
          <p className="text-xs text-ink/50">Goods low or out of stock</p>
        </Link>

        <Link href="/owner/pools" className="card p-5 transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <Users size={18} className="text-ink/70" />
            <ArrowRight size={14} className="text-ink/25" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-ink">{myPools.length}</p>
          <p className="text-xs text-ink/50">Pools you've joined</p>
        </Link>

        <Link href="/owner/exchange" className="card p-5 transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <Repeat size={18} className="text-purple-500" />
            <ArrowRight size={14} className="text-ink/25" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-ink">{matchCount}</p>
          <p className="text-xs text-ink/50">Nearby exchange matches</p>
        </Link>
      </div>

      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <div className="card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <AlertTriangle size={16} className="text-ember" /> Stock needs attention
          </div>
          <div className="mt-3 space-y-2">
            {[...outOfStock, ...lowStock].slice(0, 5).map((g) => (
              <div key={g.id} className="flex items-center justify-between text-sm">
                <span className="text-ink/70">{g.name}</span>
                <span className={g.stockQty === 0 ? "font-semibold text-red-500" : "font-semibold text-ember-dark"}>
                  {g.stockQty === 0 ? "Out of stock" : `${g.stockQty} left`}
                </span>
              </div>
            ))}
          </div>
          <Link href="/owner/goods" className="mt-3 inline-flex text-xs font-semibold text-ember-dark">
            Update stock →
          </Link>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <AiInsights shopId={shop.id} />

        <div className="card p-5">
          <h2 className="font-semibold text-ink">Your pools</h2>
          <div className="mt-3 space-y-3">
            {myPools.length === 0 && (
              <p className="text-sm text-ink/45">
                You haven't joined a bulk order yet.{" "}
                <Link href="/owner/pools" className="font-semibold text-ember-dark">
                  Browse open pools
                </Link>
              </p>
            )}
            {myPools.map((p) => {
              const mine = p.commitments.find((c) => c.shopId === shop.id)!;
              return (
                <Link
                  key={p.id}
                  href={`/owner/pools/${p.id}`}
                  className="flex items-center justify-between rounded-xl border border-ink/5 p-3 hover:bg-sand-50"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{p.productName}</p>
                    <p className="text-xs text-ink/45">
                      You joined with {mine.qty} {p.unitLabel}s
                    </p>
                  </div>
                  <p className="text-sm font-bold text-ember-dark">
                    R{currentTier(p).price}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-ink">Recent orders</h2>
          <div className="mt-3 space-y-2">
            {myOrders.slice(0, 4).map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm">
                <span className="text-ink/70">{o.consumerName}</span>
                <span className="capitalize text-ink/50">{o.status}</span>
              </div>
            ))}
            {myOrders.length === 0 && <p className="text-sm text-ink/45">No orders yet.</p>}
          </div>
          <Link href="/owner/orders" className="mt-3 inline-flex text-xs font-semibold text-ember-dark">
            View all orders →
          </Link>
        </div>
      </div>
    </div>
  );
}
