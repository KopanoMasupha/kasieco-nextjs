"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import clsx from "clsx";
import { ArrowRight, MessageCircle, Plus, Repeat, ShieldAlert, ShieldCheck, ShoppingCart, Store, Truck, Wallet } from "lucide-react";
import { useStore, useLiveRefresh, useMyShop } from "@/lib/store";
import { isVerified, statusLabel } from "@/lib/compliance";
import { findMatches, threadsFor } from "@/lib/exchange";
import { formatDistance } from "@/lib/geo";
import { formatCents, toCents, unitCentsFor } from "@/lib/pot";
import { amountDue, dealsToPay, dueText, heldInEscrow } from "@/lib/payments";
import { myStop } from "@/lib/delivery";
import PoolCard from "@/components/pot/PoolCard";
import StockChart from "@/components/StockChart";

export default function OwnerHome() {
  useLiveRefresh(5000);
  const { state } = useStore();
  const shop = useMyShop();

  if (!shop) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <Store size={30} className="mx-auto text-ink/25" />
        <h1 className="mt-3 text-lg font-semibold text-ink">Register your shop first</h1>
        <Link href="/owner/register" className="btn-dark mt-5 inline-flex px-5 py-3 text-sm">
          Register my shop
        </Link>
      </div>
    );
  }

  const verified = isVerified(shop);
  const openPools = state.pools.filter((p) => p.status === "open");
  const joinedOpen = openPools.filter((p) => p.commitments.some((c) => c.shopId === shop.id));
  const notJoined = openPools.filter((p) => !p.commitments.some((c) => c.shopId === shop.id));
  const inProgress = state.pools.filter((p) => !["open", "delivered", "cancelled"].includes(p.status) && p.commitments.some((c) => c.shopId === shop.id));
  const due = amountDue(state.pools, state.fees, shop.id);
  const toPay = dealsToPay(state.pools, shop.id);
  const heldCents = heldInEscrow(state.pools, shop.id);
  // what this shop saves against buying alone, across its live deals
  const savings = [...joinedOpen, ...inProgress].reduce((s, p) => {
    const mine = p.commitments.find((c) => c.shopId === shop.id)!;
    return s + mine.qty * Math.max(0, toCents(p.retailPrice) - unitCentsFor(p, p.minQty));
  }, 0);
  // my deliveries that still need something from me (or are on the way)
  const deliveries = state.pools
    .filter((p) => p.status !== "open" && p.status !== "cancelled" && p.commitments.some((c) => c.shopId === shop.id))
    .map((p) => ({ p, x: myStop(state.trips, p.id, shop.id) }))
    .filter(({ x }) => x && x.stop.status !== "delivered") as { p: (typeof state.pools)[number]; x: NonNullable<ReturnType<typeof myStop>> }[];
  const holding = state.trips.flatMap((t) => t.stops.filter((s) => s.status === "at-partner" && s.partnerShopId === shop.id));

  const matches = findMatches(shop, state.listings);
  const chats = threadsFor(shop.id, state.threads).filter((t) => t.status === "open");
  const matchedIds = new Set(matches.map((m) => m.listing.id));
  const nearbyListings = state.listings
    .filter((l) => l.shopId !== shop.id && l.status === "open" && !matchedIds.has(l.id))
    .slice(0, Math.max(1, 4 - Math.min(matches.length, 3)));

  const firstName = shop.ownerName.split(" ")[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink/50">Sawubona, {firstName}</p>
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">{shop.name}</h1>
        </div>
        <Link
          href="/owner/compliance"
          className={clsx(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
            verified ? "bg-leaf/10 text-leaf" : "bg-ember/10 text-ember-dark"
          )}
        >
          {verified ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />} {statusLabel(shop.verificationStatus)}
        </Link>
      </div>

      {!verified && (
        <div className="glass-dark flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="font-semibold">Get verified to start buying</p>
            <p className="text-sm text-white/60">A free 15-minute course.</p>
          </div>
          <Link href="/owner/compliance" className="btn-ember px-5 py-2.5 text-sm">
            Get verified
          </Link>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center glass-dark p-5">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs text-white/60">
              <Wallet size={13} /> Due now
            </p>
            <p className={clsx("num font-display text-4xl font-bold", due > 0 && "text-[#FFB38F]")}>{formatCents(due)}</p>
          </div>
          <div>
            <p className="text-xs text-white/60">In escrow · TradeSafe</p>
            <p className="num text-lg font-bold text-white/85">{formatCents(heldCents)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {due > 0 && (
            <Link href="/owner/payments" className="btn-ember px-5 py-2.5 text-sm">
              <Plus size={14} /> Pay now
            </Link>
          )}
          <Link href="/owner/pools" className="btn-outline !border-white/30 !bg-white/10 px-5 py-2.5 text-sm !text-white">
            <ShoppingCart size={14} /> Buy stock
          </Link>
        </div>
      </section>

      {toPay.map(({ pool: p, pos }) => (
        <Link key={p.id} href={`/owner/pools/${p.id}`} className="card flex flex-wrap items-center gap-4 border-2 border-ember p-4 hover:shadow-lg">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ember text-white">
            <Wallet size={20} />
          </span>
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-semibold text-ink">
              {p.productName} is full — pay {formatCents(pos.dueCents)}
            </span>
            <span className="text-ink/55">{dueText(p.paymentDueAt)} · held by TradeSafe until delivery</span>
          </span>
          <span className="btn-pill bg-[#0B3D3A] px-4 py-2 text-sm text-white">Pay</span>
        </Link>
      ))}

      {deliveries.map(({ p, x }) => {
        const { trip, stop } = x;
        const headline =
          stop.status === "at-partner"
            ? `Collect at ${stop.partnerShopName}`
            : stop.status === "returned"
            ? stop.nextRun
              ? "Missed — rebooking"
              : `Collect at ${trip.pickup.name}`
            : trip.status === "collected"
            ? "On the way"
            : stop.confirmed
            ? "Delivery booked"
            : "Confirm you'll be there";
        const warn = stop.status !== "pending" || !stop.confirmed;
        return (
          <Link key={p.id} href={`/owner/pools/${p.id}`} className={clsx("card flex flex-wrap items-center gap-4 p-4 hover:shadow-lg", warn ? "border-amber-300" : "border-ember/30")}>
            <span className={clsx("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", warn ? "bg-amber-100 text-amber-700" : "bg-ember/10 text-ember-dark")}>
              {stop.status === "at-partner" ? <Store size={20} /> : <Truck size={20} />}
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <span className="block font-semibold text-ink">
                {headline}: {stop.qty} × {p.productName}
              </span>
              <span className="text-ink/55">
                {stop.status === "pending"
                  ? `${new Date(trip.date + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "short" })}, ${stop.window} · ${trip.driverName}`
                  : "Tap for details"}
              </span>
            </span>
            <span className="rounded-xl bg-ink px-3 py-2 text-center text-white">
              <span className="block text-[10px] text-white/60">Code</span>
              <span className="font-mono text-lg font-extrabold tracking-widest">{p.deliveryCodes[shop.id]}</span>
            </span>
          </Link>
        );
      })}

      {holding.length > 0 && (
        <Link href="/owner/partner" className="card flex items-center gap-4 border-leaf/30 p-4 hover:shadow-lg">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-leaf/10 text-leaf">
            <Store size={20} />
          </span>
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-semibold text-ink">Holding stock for {holding.length} neighbour{holding.length === 1 ? "" : "s"}</span>
            <span className="text-ink/55">Hand over with their code.</span>
          </span>
          <ArrowRight size={16} className="text-ink/30" />
        </Link>
      )}

      <StockChart shopId={shop.id} />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ---------- BUY ---------- */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card flex flex-col p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ember text-white">
                <ShoppingCart size={20} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-ink">Buy</h2>
              </div>
            </div>
            <Link href="/owner/pools" className="btn-dark px-3.5 py-2 text-xs">
              All deals
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl2 bg-sand-50 p-3">
              <p className="text-xs text-ink/45">Your deals</p>
              <p className="num font-display text-2xl font-bold text-ink">{joinedOpen.length + inProgress.length}</p>
            </div>
            <div className="rounded-xl2 bg-leaf/10 p-3">
              <p className="text-xs text-leaf/80">You save</p>
              <p className="num font-display text-2xl font-bold text-leaf">{formatCents(savings)}</p>
            </div>
          </div>

          <div className="mt-5 flex-1 space-y-3">
            {inProgress.length > 0 && <p className="eyebrow">On the way</p>}
            {inProgress.slice(0, 2).map((p) => (
              <PoolCard key={p.id} pool={p} myShopId={shop.id} compact />
            ))}
            {joinedOpen.length > 0 && <p className="eyebrow">Filling up</p>}
            {joinedOpen.slice(0, 2).map((p) => (
              <PoolCard key={p.id} pool={p} myShopId={shop.id} compact />
            ))}
            {notJoined.length > 0 && <p className="eyebrow">New</p>}
            {notJoined.slice(0, 2).map((p) => (
              <PoolCard key={p.id} pool={p} myShopId={shop.id} compact />
            ))}
            {openPools.length === 0 && inProgress.length === 0 && <p className="text-sm text-ink/45">No open deals right now.</p>}
          </div>

        </motion.section>

        {/* ---------- EXCHANGE ---------- */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="card flex flex-col p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-leaf text-white">
                <Repeat size={20} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-ink">Willing buyer & seller</h2>
              </div>
            </div>
            <Link href="/owner/exchange?post=1" className="btn-dark px-3.5 py-2 text-xs">
              <Plus size={13} /> Post
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl2 bg-sand-50 p-3">
              <p className="text-xs text-ink/45">Matches</p>
              <p className="num font-display text-2xl font-bold text-ink">{matches.length}</p>
            </div>
            <div className="rounded-xl2 bg-sand-50 p-3">
              <p className="text-xs text-ink/45">Chats</p>
              <p className="num font-display text-2xl font-bold text-ink">{chats.length}</p>
            </div>
          </div>

          <div className="mt-5 flex-1 space-y-2">
            <p className="eyebrow">{matches.length ? "Matches" : "Latest"}</p>
            {matches.slice(0, 3).map((m) => (
              <Link
                key={m.listing.id + m.mine.id}
                href="/owner/exchange"
                className="flex items-center justify-between gap-3 rounded-xl2 bg-sand-50 p-3 hover:bg-sand-100"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">
                    {m.listing.shopName} {m.listing.type === "have" ? "has" : "needs"} {m.listing.qty} × {m.listing.item}
                  </span>
                  <span className="text-xs text-ink/45">
                    {formatDistance(m.dist)} away
                  </span>
                </span>
                <MessageCircle size={16} className="shrink-0 text-leaf" />
              </Link>
            ))}
            {matches.length > 0 && nearbyListings.length > 0 && <p className="eyebrow pt-2">Also posted</p>}
            {nearbyListings.map((l) => (
                <Link key={l.id} href="/owner/exchange" className="flex items-center justify-between gap-3 rounded-xl2 bg-sand-50 p-3 hover:bg-sand-100">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {l.shopName} {l.type === "have" ? "has" : "needs"} {l.qty} × {l.item}
                    </span>
                    <span className="text-xs text-ink/45">
                      {l.township} · wants {l.wantInReturn.toLowerCase()}
                    </span>
                  </span>
                  <ArrowRight size={15} className="shrink-0 text-ink/25" />
                </Link>
              ))}
            {chats.slice(0, 2).map((t) => {
              const other = state.shops.find((s) => s.id === (t.shopAId === shop.id ? t.shopBId : t.shopAId));
              const last = t.messages[t.messages.length - 1];
              return (
                <Link key={t.id} href={`/owner/exchange/${t.id}`} className="flex items-center gap-3 rounded-xl2 border border-ink/[0.07] p-3 hover:bg-sand-100">
                  <MessageCircle size={15} className="shrink-0 text-ink/40" />
                  <span className="min-w-0 text-sm">
                    <span className="font-medium text-ink">{other?.name}</span>
                    <span className="block truncate text-xs text-ink/45">{last ? last.text : "No messages yet"}</span>
                  </span>
                </Link>
              );
            })}
          </div>

        </motion.section>
      </div>

    </div>
  );
}
