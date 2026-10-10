"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import PriceBoard from "@/components/PriceBoard";
import { formatRand, totalQty } from "@/lib/pricing";
import { auditPot, quoteForMembers, quoteJoin, rand } from "@/lib/pot";
import { CheckCircle2, MapPin, Truck, BadgeCheck, Crown, ShieldCheck } from "lucide-react";
import clsx from "clsx";

export default function PoolDetailPage({ params }: { params: { id: string } }) {
  const { state, dispatch } = useStore();
  const pool = state.pools.find((p) => p.id === params.id);
  const shop = state.shops.find((s) => s.id === state.myShopId);
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showProof, setShowProof] = useState(false);

  useEffect(() => {
    if (pool?.status !== "delivering") return;
    if (deliveredCount >= pool.commitments.length) {
      const timer = setTimeout(async () => {
        if (shop && shop.id === pool.ownerShopId) {
          await dispatch({ type: "COMPLETE_POOL_DELIVERY", poolId: pool.id, shopId: shop.id });
        }
      }, 800);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setDeliveredCount((count) => count + 1), 1300);
    return () => clearTimeout(timer);
  }, [pool, deliveredCount, shop, dispatch]);

  const audit = useMemo(() => pool ? auditPot(pool) : null, [pool]);
  if (!pool) return notFound();
  const qty = totalQty(pool);
  const reached = qty >= pool.minQty;
  const isOwner = !!shop && shop.id === pool.ownerShopId;
  const members = quoteForMembers(pool, pool.commitments);
  const eligibleDemoShop = state.shops.find(
    (candidate) => candidate.id !== shop?.id &&
      candidate.verificationStatus === "verified" &&
      !pool.commitments.some((member) => member.shopId === candidate.id)
  );

  async function settle(type: "CLOSE_POOL" | "CANCEL_POOL") {
    if (!shop) return;
    setBusy(true);
    setError("");
    const result = await dispatch({ type, poolId: pool!.id, shopId: shop.id });
    setBusy(false);
    if (result.error) setError(result.error);
  }

  async function simulateJoin() {
    if (!pool || !eligibleDemoShop) return;
    const units = 3;
    const quote = quoteJoin(pool, {
      shopId: eligibleDemoShop.id,
      shopName: eligibleDemoShop.name,
      township: eligibleDemoShop.township,
      qty: units,
      paid: true,
      joinedAt: new Date().toISOString(),
    });
    const result = await dispatch({
      type: "JOIN_POOL",
      poolId: pool.id,
      shopId: eligibleDemoShop.id,
      qty: units,
      method: "wallet",
      expectedCents: quote.paymentCents,
    });
    if (result.error) setError(result.error);
    else setMessage(`${eligibleDemoShop.name} paid ${rand(result.paymentCents)} · ${result.reference}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/owner/pools" className="text-sm text-ink/55">← Bulk buy</Link>
      <div>
        <h1 className="text-xl font-bold text-ink">{pool.productName}</h1>
        <p className="flex items-center gap-1 text-sm font-medium text-leaf">
          <BadgeCheck size={14} /> {pool.supplierName} · {pool.status}
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
        <div className="mt-3 flex items-center justify-between rounded-xl bg-ink px-4 py-3 text-sm text-white">
          <span>Money held in sandbox pot</span><strong>{rand(pool.balanceCents ?? 0)}</strong>
        </div>
        <p className="mt-2 text-xs text-ink/40">Sandbox only — no real funds are transferred or held.</p>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-ink">Who's in this pot</h2>
        <div className="mt-3 space-y-3">
          {pool.commitments.map((member) => {
            const share = members.find((item) => item.shopId === member.shopId);
            const credit = (member.paidCents ?? 0) - (share?.totalCents ?? 0);
            return (
              <div key={member.shopId} className="rounded-xl border border-ink/5 p-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-ink/75">
                    {pool.ownerShopId === member.shopId ? <Crown size={14} className="text-ember" /> : <MapPin size={13} className="text-ink/30" />}
                    {member.shopName}
                  </span>
                  <span className="text-ink/45">{member.qty} {pool.unitLabel}s · {member.township}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-ink/55 sm:grid-cols-4">
                  <span>Paid {rand(member.paidCents ?? 0)}</span>
                  <span>Goods {rand(share?.goodsCents ?? 0)}</span>
                  <span>Trip {rand(share?.deliveryCents ?? 0)}</span>
                  <span>Fee {rand(share?.feeCents ?? 0)}</span>
                  <span className={credit > 0 ? "font-semibold text-leaf" : ""}>
                    {credit > 0 ? `Credit ${rand(credit)}` : "No credit due"}
                  </span>
                </div>
              </div>
            );
          })}
          {pool.commitments.length === 0 && <p className="text-sm text-ink/45">No contributions yet. The first shop to pay becomes the pot owner.</p>}
        </div>
      </div>

      {isOwner && pool.status === "open" && (
        <div className="flex flex-wrap gap-2">
          {reached && <button disabled={busy} onClick={() => settle("CLOSE_POOL")} className="btn-ember flex-1 py-3 text-sm">Close & place the order</button>}
          {!reached && pool.commitments.length > 0 && <button disabled={busy} onClick={() => settle("CANCEL_POOL")} className="btn-outline flex-1 py-3 text-sm">Cancel & refund everyone</button>}
          {eligibleDemoShop && <button onClick={simulateJoin} className="btn-outline w-full py-2.5 text-xs">Simulate another shop joining</button>}
        </div>
      )}
      {error && <p role="alert" className="card border-red-200 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="card border-leaf/20 p-3 text-sm text-leaf">{message}</p>}

      <section className="card p-5">
        <h2 className="font-semibold text-ink">Live payments</h2>
        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
          {[...(pool.ledger ?? [])].reverse().map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/5 py-2 text-xs">
              <div>
                <p className="font-medium capitalize text-ink/75">{entry.type.replace("-", " ")}{entry.shopId ? ` · ${state.shops.find((item) => item.id === entry.shopId)?.name ?? "Shop"}` : ""}</p>
                <p className="text-ink/40">{entry.reference} · {entry.method?.replace("-", " ") ?? "pot payout"} · {new Date(entry.createdAt).toLocaleString("en-ZA")}</p>
              </div>
              <div className="text-right"><p className={entry.amountCents < 0 ? "font-semibold text-ink/65" : "font-semibold text-leaf"}>{entry.amountCents < 0 ? "−" : "+"}{rand(Math.abs(entry.amountCents))}</p><p className="text-ink/40">Balance {rand(entry.balanceCents)}</p></div>
            </div>
          ))}
          {(pool.ledger ?? []).length === 0 && <p className="text-sm text-ink/40">No payments recorded yet.</p>}
        </div>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-ink">Ledger proof</h2>
          <span className={clsx("text-xs font-semibold", audit?.valid ? "text-leaf" : "text-red-600")}>
            {audit?.valid ? "✓ All checks pass" : "Ledger needs attention"}
          </span>
        </div>
        <button onClick={() => setShowProof((open) => !open)} className="mt-2 text-xs font-semibold text-ember-dark">
          {showProof ? "Hide proof" : "Show proof"}
        </button>
        {showProof && (
          <div className="mt-3 space-y-2 text-xs">
            {[
              ["Every entry replays to its recorded balance", audit?.valid],
              ["The pot never went below R0", audit?.valid],
              ["Money in minus money out equals balance", audit?.valid],
              ["No shop owes more than it paid", audit?.valid],
              ["Settled pots end at exactly R0", audit?.valid],
            ].map(([label, valid]) => (
              <p key={String(label)} className={valid ? "text-leaf" : "text-red-600"}>
                {valid ? "✓" : "✗"} {label}
              </p>
            ))}
            {audit?.errors.map((item) => <p key={item} className="text-red-600">{item}</p>)}
          </div>
        )}
      </section>

      {(pool.status === "delivering" || pool.status === "delivered") && (
        <div className="card p-5">
          <h2 className="flex items-center gap-2 font-semibold text-ink"><Truck size={16} className="text-ember" /> Delivery tracking (demo)</h2>
          <div className="mt-4 space-y-3">
            {pool.commitments.map((member, index) => {
              const arrived = index < deliveredCount || pool.status === "delivered";
              return (
                <div key={member.shopId} className="flex items-center gap-3">
                  <div className={clsx("flex h-7 w-7 items-center justify-center rounded-full", arrived ? "bg-leaf text-white" : "bg-sand-100 text-ink/30")}>
                    {arrived ? <CheckCircle2 size={15} /> : index + 1}
                  </div>
                  <div className="flex-1"><p className="text-sm font-medium text-ink">{member.shopName}</p><p className="text-xs text-ink/40">{member.township}</p></div>
                  <span className={clsx("text-xs font-medium", arrived ? "text-leaf" : "text-ink/40")}>{arrived ? "Delivered" : "En route"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <p className="flex items-center gap-1 text-xs text-ink/35"><ShieldCheck size={13} /> Payments are simulated in this prototype; production requires a licensed payment provider and escrow arrangement.</p>
    </div>
  );
}
