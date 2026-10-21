"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, UserPlus, Wallet, MessageSquare, PackageCheck } from "lucide-react";
import { useStore, useLiveRefresh, useMyShop } from "@/lib/store";
import { isVerified } from "@/lib/compliance";
import { formatCents, memberPositions, potBalance, totalQtyOf, toCents, unitCentsFor } from "@/lib/pot";
import DealPaymentCard from "@/components/pay/DealPaymentCard";
import DealPriceHero from "@/components/deal/DealPriceHero";
import DealShowcase from "@/components/deal/DealShowcase";
import DealSocialProof from "@/components/deal/DealSocialProof";
import LedgerFeed from "@/components/pot/LedgerFeed";
import LedgerProof from "@/components/pot/LedgerProof";
import MemberTable from "@/components/pot/MemberTable";
import DealTracker from "@/components/deal/DealTracker";
import JoinDealModal from "@/components/deal/JoinDealModal";
import MyDeliveryCard from "@/components/deal/MyDeliveryCard";
import { PageSkeleton } from "@/components/Skeleton";
import { units } from "@/lib/units";
import RateDealCard from "@/components/shop/RateDealCard";
import AlsoReserved from "@/components/shop/AlsoReserved";

export default function DealPage({ params }: { params: { id: string } }) {
  useLiveRefresh(3000);
  const { state, dispatch, loading } = useStore();
  const shop = useMyShop();
  const pool = state.pools.find((p) => p.id === params.id);
  const [joining, setJoining] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // a real view: counts towards "viewed by N shops today" for other owners
  useEffect(() => {
    if (pool?.id && shop?.id) dispatch({ type: "VIEW_DEAL", dealId: pool.id, shopId: shop.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool?.id, shop?.id]);

  if (!pool) {
    if (loading) return <PageSkeleton />;
    return (
      <div className="card p-6 text-sm text-ink/60">
        Deal not found.{" "}
        <Link href="/owner/pools" className="font-semibold text-ember-dark">
          See all deals
        </Link>
      </div>
    );
  }

  const qty = totalQtyOf(pool);
  const left = pool.minQty - qty;
  const mine = memberPositions(pool).find((m) => m.shopId === shop?.id);
  const canJoin = pool.status === "open" && shop && isVerified(shop) && left > 0;
  const onWaitlist = !!shop && pool.waitlist.some((w) => w.shopId === shop.id);
  const canWaitlist = pool.status === "target-reached" && shop && isVerified(shop) && !mine && !onWaitlist;
  const arrived =
    !!mine && (pool.status === "delivered" || state.trips.some((t) => t.dealId === pool.id && t.stops.some((st) => st.shopId === shop?.id && st.status === "delivered")));
  const dealMessages = state.messages.filter((m) => m.dealId === pool.id && m.toRole === "owner" && m.toId === shop?.id).slice().reverse();

  // owners never see other shops' names
  const hideNames = (text: string) =>
    pool.commitments.filter((c) => c.shopId !== shop?.id).reduce((t, c) => t.split(c.shopName).join(`a shop in ${c.township}`), text);

  async function simulate() {
    setBusy(true);
    setNotice(null);
    const meta = await dispatch({ type: "SIMULATE_JOIN", dealId: pool!.id, excludeShopId: shop?.id });
    setBusy(false);
    setNotice(meta.error ? meta.error : `${meta.joined?.length === 1 ? "Another shop" : `${meta.joined?.length} shops`} reserved units.`);
  }

  return (
    <div className={clsx("space-y-5", canJoin && "pb-20 lg:pb-0")}>
      <Link href="/owner/pools" className="inline-flex items-center gap-1 text-sm text-ink/50 hover:text-ink">
        <ArrowLeft size={14} /> All deals
      </Link>

      {/* the product, shown like a good online store: picture, what's in the pack, resale profit, trust */}
      <DealShowcase pool={pool} />

      {/* the first thing you see: alone vs together, and how close the lowest price is */}
      <DealPriceHero pool={pool} myQty={mine?.qty} />

      {/* join: who is in, what is left, the deadline — then the action */}
      <section className="card grid gap-6 p-5 sm:p-6 md:grid-cols-[minmax(0,1fr)_240px]">
        <DealSocialProof pool={pool} myShopId={shop?.id} />
        <div className="space-y-4 md:border-l md:border-ink/[0.07] md:pl-6">
          {mine && (
            <div className="rounded-xl2 bg-sand-50 p-3 text-sm">
              <p className="font-semibold text-ink">You reserved {mine.qty} {units(pool.unitLabel, mine.qty)}</p>
              <p className="num text-ink/60">{mine.paid && mine.paidCents > 0 ? `Paid ${formatCents(mine.paidCents)}` : pool.status === "open" ? "Nothing paid — you pay when it fills" : `Due ${formatCents(mine.dueCents)}`}</p>
            </div>
          )}
          {pool.status === "open" && (
            <>
              <div className="flex flex-wrap gap-2 md:flex-col">
                <button disabled={!canJoin} onClick={() => setJoining(true)} className="btn-ember px-5 py-3 text-sm">
                  <Wallet size={15} /> {mine ? "Reserve more" : "Reserve units"}
                </button>
                <button disabled={busy} onClick={simulate} className="btn-outline px-4 py-3 text-sm" title="Demo: another verified shop reserves units">
                  <UserPlus size={15} /> {busy ? "Joining…" : "Demo: shop joins"}
                </button>
              </div>
              <p className="text-xs text-ink/45">Free to reserve · pay only when it fills</p>
            </>
          )}
          {canWaitlist && (
            <div className="space-y-1">
              <button onClick={() => setJoining(true)} className="btn-outline px-5 py-3 text-sm">
                <Wallet size={15} /> Join the waitlist
              </button>
              <p className="text-xs text-ink/45">Full — you get a spot if a shop doesn't pay in time.</p>
            </div>
          )}
          {shop && !isVerified(shop) && pool.status === "open" && (
            <p className="text-xs text-ember-dark">
              Only verified shops can join.{" "}
              <Link href="/owner/compliance" className="font-semibold underline">
                Get verified
              </Link>
            </p>
          )}
          {notice && <p className="rounded-lg bg-sand-50 px-3 py-2 text-sm text-ink/70">{notice}</p>}
        </div>
      </section>

      {pool.status === "open" && <AlsoReserved pool={pool} pools={state.pools} />}

      {arrived && shop && <RateDealCard pool={pool} shopId={shop.id} />}

      {shop && (mine || onWaitlist) && <DealPaymentCard pool={pool} shop={shop} />}

      <section className="card p-5">
        <DealTracker status={pool.status} audience="owner" />
      </section>

      {/* my delivery: codes, booked slot, "I'll be there", and where my stock is if I was missed */}
      {mine && shop && <MyDeliveryCard pool={pool} shop={shop} />}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-ink">Shops ({pool.commitments.length})</h2>
            <MemberTable pool={pool} myShopId={shop?.id} anonymous />
          </section>

          {dealMessages.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink">
                <MessageSquare size={16} className="text-ember" /> Messages
              </h2>
              <ul className="space-y-2">
                {dealMessages.map((m) => (
                  <li key={m.id} className="rounded-xl bg-sand-50 px-3 py-2 text-sm">
                    <p className="text-ink/80">{m.text}</p>
                    <p className="mt-0.5 text-[11px] text-ink/40">
                      {m.fromName} · {new Date(m.createdAt).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-ink">Escrow · TradeSafe</h2>
              {pool.status === "open" && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-leaf">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-leaf" />
                  </span>
                  Live
                </span>
              )}
            </div>
            <p className="mb-2 text-xs text-ink/45">
              {formatCents(potBalance(pool.ledger))} · {pool.ledger.length} entries
            </p>
            <div className="max-h-[420px] overflow-y-auto pr-1">
              <LedgerFeed pool={pool} myShopId={shop?.id} anonymous />
            </div>
          </section>
          <LedgerProof pool={pool} />
          <section className="card p-4 text-xs text-ink/55">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-ink/70">
              <PackageCheck size={14} /> History
            </p>
            <ol className="space-y-1.5">
              {pool.events
                .slice()
                .reverse()
                .slice(0, 5)
                .map((e, i) => (
                  <li key={i}>
                    {hideNames(e.text)}{" "}
                    <span className="text-ink/35">· {new Date(e.at).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </li>
                ))}
            </ol>
          </section>
        </aside>
      </div>

      {/* phones: the price and the action stay in reach while scrolling (space on the right for the help button) */}
      {canJoin && !joining && (
        <div className="fixed inset-x-0 bottom-0 z-[800] border-t border-ink/[0.08] bg-white/95 px-4 py-3 pr-20 backdrop-blur lg:hidden" data-tour="deal-join">
          <div className="flex items-center gap-3">
            <div className="min-w-0 leading-tight">
              <p className="num text-xs text-ink/40 line-through">{formatCents(toCents(pool.retailPrice))}</p>
              <p className="num font-display text-lg font-bold text-leaf">{formatCents(unitCentsFor(pool, pool.minQty))}</p>
            </div>
            <button onClick={() => setJoining(true)} className="btn-ember flex-1 py-3 text-sm">
              <Wallet size={15} /> {mine ? "Reserve more" : "Reserve — pay later"}
            </button>
          </div>
        </div>
      )}

      {joining && shop && <JoinDealModal pool={pool} shop={shop} onClose={() => setJoining(false)} />}
    </div>
  );
}
