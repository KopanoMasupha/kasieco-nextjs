"use client";

import Link from "next/link";
import { ShieldAlert, ShoppingBag, Wallet, TrendingDown, Undo2, Truck } from "lucide-react";
import { useStore, useLiveRefresh, useMyShop } from "@/lib/store";
import { isVerified } from "@/lib/compliance";
import { amountDue } from "@/lib/payments";
import { formatCents } from "@/lib/pot";
import PoolCard from "@/components/pot/PoolCard";
import ProductTile from "@/components/shop/ProductTile";
import { useCart } from "@/lib/cart";
import { CardListSkeleton } from "@/components/Skeleton";
import { platformSavingsCents } from "@/lib/products";

export default function BuyPage() {
  useLiveRefresh(5000);
  const { state, loading } = useStore();
  const shop = useMyShop();
  const cart = useCart();
  const open = state.pools.filter((p) => p.status === "open");
  const mine = state.pools.filter((p) => p.status !== "open" && shop && p.commitments.some((c) => c.shopId === shop.id));
  const due = shop ? amountDue(state.pools, state.fees, shop.id) : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">Buy stock together</h1>
          <p className="mt-1 text-sm text-ink/55">Add deals to your cart, then reserve them all at checkout. You pay R0 today.</p>
          {platformSavingsCents(state.pools) > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-leaf/10 px-3 py-1 text-xs font-semibold text-leaf">
              <TrendingDown size={13} /> Kasi shops have saved <span className="num">{formatCents(platformSavingsCents(state.pools))}</span> buying together
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {due > 0 && (
            <Link href="/owner/payments" className="btn-outline px-4 py-2.5 text-sm">
              <Wallet size={15} /> Pay {formatCents(due)}
            </Link>
          )}
          <Link href="/owner/cart" className="btn-ember px-4 py-2.5 text-sm">
            <ShoppingBag size={15} /> Cart{cart.count > 0 ? ` · ${cart.count}` : ""}
          </Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="How buying works">
        {[
          { icon: TrendingDown, title: "Add deals to cart" },
          { icon: Undo2, title: "Choose delivery once" },
          { icon: Wallet, title: "Reserve for R0" },
          { icon: Truck, title: "Pay when full" },
        ].map((x, i) => (
          <div key={x.title} className="flex items-center gap-3 rounded-2xl border border-dashed border-ink/15 px-4 py-3">
            <span className="num font-display text-2xl font-bold text-ember">{i + 1}</span>
            <x.icon size={16} className="shrink-0 text-ink/40" />
            <p className="text-sm font-semibold text-ink">{x.title}</p>
          </div>
        ))}
      </section>

      {shop && !isVerified(shop) && (
        <div className="card flex items-center gap-3 border-ember/30 p-4 text-sm">
          <ShieldAlert size={18} className="shrink-0 text-ember" />
          <p className="text-ink/70">
            Only verified shops can buy.{" "}
            <Link href="/owner/compliance" className="font-semibold text-ember-dark underline">
              Get verified
            </Link>
          </p>
        </div>
      )}

      <section>
        <h2 className="mb-4 text-2xl font-bold text-ink">Open deals ({open.length})</h2>
        <div data-tour="deal-list" className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
          {loading && !state.pools.length && <CardListSkeleton rows={2} />}
          {open.map((p) => (
            <ProductTile key={p.id} pool={p} canBuy={!!shop && isVerified(shop)} />
          ))}
        </div>
        {!loading && open.length === 0 && <div className="card p-6 text-sm text-ink/50">No open deals right now.</div>}
      </section>

      {mine.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold text-ink">Your closed deals</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {mine.map((p) => (
              <PoolCard key={p.id} pool={p} myShopId={shop?.id} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
