"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { isVerified, statusLabel, STATUS_STYLE } from "@/lib/compliance";
import { ArrowRight, Repeat, ShieldAlert, ShieldCheck, Store, Users } from "lucide-react";
import clsx from "clsx";
import { totalQty } from "@/lib/pricing";
import { rand } from "@/lib/pot";

export default function OwnerDashboard() {
  const { state } = useStore();
  const shop = state.shops.find((item) => item.id === state.myShopId);

  if (!shop) {
    return (
      <div className="mx-auto max-w-md py-14 text-center">
        <Store size={30} className="mx-auto text-ink/25" />
        <h1 className="mt-3 text-lg font-semibold text-ink">Register your shop first</h1>
        <p className="mt-1 text-sm text-ink/50">Once you're registered, customers can find you on the map.</p>
        <Link href="/owner/register" className="btn-dark mt-5 inline-flex px-5 py-3 text-sm">Register my shop</Link>
      </div>
    );
  }

  const ownedPools = state.pools.filter((pool) => pool.commitments.some((member) => member.shopId === shop.id));
  const poolFunds = ownedPools.reduce((sum, pool) => sum + (pool.balanceCents ?? 0), 0);
  const myListings = state.listings.filter((listing) => listing.shopId === shop.id && listing.status === "open");
  const exchangeMatches = myListings.reduce((total, listing) => {
    const opposite = listing.type === "have" ? "need" : "have";
    return total + state.listings.filter((other) =>
      other.shopId !== shop.id && other.status === "open" &&
      other.type === opposite && other.item.toLowerCase() === listing.item.toLowerCase()
    ).length;
  }, 0);
  const nearbyPools = state.pools.filter((pool) =>
    pool.status === "open" && !pool.commitments.some((member) => member.shopId === shop.id)
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ember-dark">{shop.township}</p>
        <h1 className="text-xl font-bold text-ink">{shop.name}</h1>
        <p className="text-sm text-ink/50">Buy together and exchange stock with shops nearby.</p>
      </div>
      <Link
        href="/owner/compliance"
        className={clsx("card flex items-center justify-between gap-3 p-4 transition-shadow hover:shadow-md", !isVerified(shop) && "border-ember/30")}
      >
        <div className="flex items-center gap-3">
          {isVerified(shop) ? <ShieldCheck size={18} className="text-leaf" /> : <ShieldAlert size={18} className="text-ember" />}
          <div>
            <p className="text-sm font-semibold text-ink">Compliance status</p>
            <p className="text-xs text-ink/45">{isVerified(shop) ? "Verified — customers can find you and you can trade." : "Complete verification to unlock trading."}</p>
          </div>
        </div>
        <span className={clsx("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLE[shop.verificationStatus])}>{statusLabel(shop.verificationStatus)}</span>
      </Link>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/owner/pools" className="card group p-6 transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <Users size={20} className="text-ember-dark" /><ArrowRight size={15} className="text-ink/25 transition-transform group-hover:translate-x-1" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-ink">Bulk buy</h2>
          <p className="mt-1 text-sm text-ink/50">{ownedPools.length} pot{ownedPools.length === 1 ? "" : "s"} · {nearbyPools.length} you can join</p>
          <p className="mt-3 text-2xl font-extrabold text-ink">{rand(poolFunds)}</p>
          <p className="text-xs text-ink/45">Sandbox money currently in your pots</p>
          {ownedPools.length > 0 && <p className="mt-3 text-xs text-ember-dark">{totalQty(ownedPools[0])} units in {ownedPools[0].productName}</p>}
        </Link>
        <Link href="/owner/exchange" className="card group p-6 transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <Repeat size={20} className="text-leaf" /><ArrowRight size={15} className="text-ink/25 transition-transform group-hover:translate-x-1" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-ink">Stock exchange</h2>
          <p className="mt-1 text-sm text-ink/50">{myListings.length} open listing{myListings.length === 1 ? "" : "s"} · {exchangeMatches} nearby match{exchangeMatches === 1 ? "" : "es"}</p>
          <p className="mt-5 text-sm font-semibold text-leaf">Post stock you have or need <ArrowRight size={14} className="inline" /></p>
        </Link>
      </div>
    </div>
  );
}
