"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  PartyPopper,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
  Wallet,
  XCircle,
} from "lucide-react";
import { useStore, useMyShop } from "@/lib/store";
import { isVerified } from "@/lib/compliance";
import { formatCents, toCents } from "@/lib/pot";
import { amountDue, nextPaymentDeadline } from "@/lib/payments";
import { itemsPerUnit } from "@/lib/products";
import { lineEstimate, unitsLeft, useCart } from "@/lib/cart";
import { units } from "@/lib/units";
import ProductImage from "@/components/ProductImage";
import QtyStepper from "@/components/shop/QtyStepper";
import DeliveryChoices, { DEFAULT_DRAFT, PrefsDraft, draftProblem } from "@/components/deal/DeliveryChoices";
import Countdown from "@/components/pay/Countdown";
import { PageSkeleton } from "@/components/Skeleton";

type Stage = "cart" | "delivery" | "placing" | "done";
interface Result {
  dealId: string;
  name: string;
  qty: number;
  unitLabel: string;
  error?: string;
  filled?: boolean;
  waitlisted?: boolean;
}

const STEPS = ["Cart", "Delivery", "Reserved"] as const;

export default function CartPage() {
  const { state, dispatch, loading } = useStore();
  const shop = useMyShop();
  const cart = useCart();
  const [stage, setStage] = useState<Stage>("cart");
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState("");

  const lastUsed = useMemo(
    () => (shop ? [...state.pools].reverse().map((pool) => pool.commitments.find((commitment) => commitment.shopId === shop.id)?.prefs).find(Boolean) : undefined),
    [state.pools, shop]
  );
  const [prefs, setPrefs] = useState<PrefsDraft | null>(null);
  const draft: PrefsDraft = prefs ?? (lastUsed
    ? {
        days: lastUsed.days,
        time: lastUsed.time,
        ifMissed: lastUsed.ifMissed,
        partnerShopId: lastUsed.partnerShopId,
        backupName: lastUsed.backupName,
        backupPhone: lastUsed.backupPhone,
      }
    : DEFAULT_DRAFT);
  const [agreed, setAgreed] = useState(false);

  if (!shop) return loading ? <PageSkeleton /> : null;

  const lines = cart.items.flatMap((item) => {
    const pool = state.pools.find((candidate) => candidate.id === item.dealId);
    return pool ? [{ item, pool }] : [];
  });
  const missingCount = cart.items.length - lines.length;
  const totals = lines.reduce(
    (total, { item, pool }) => {
      if (pool.status !== "open") return total;
      const qty = Math.min(item.qty, unitsLeft(pool));
      const estimate = qty > 0 ? lineEstimate(pool, qty) : null;
      return estimate
        ? {
            later: total.later + estimate.totalCents,
            saved: total.saved + estimate.savingsCents,
            alone: total.alone + estimate.aloneCents,
          }
        : total;
    },
    { later: 0, saved: 0, alone: 0 }
  );
  const totalUnits = lines.reduce((sum, line) => sum + line.item.qty, 0);
  const verified = isVerified(shop);
  const shopId = shop.id;
  const due = amountDue(state.pools, state.fees, shop.id);
  const deadline = nextPaymentDeadline(state.pools, shop.id);
  const hasOverLimit = lines.some(({ item, pool }) => pool.status === "open" && item.qty > unitsLeft(pool));
  const canReserve = lines.length > 0 && missingCount === 0 && !hasOverLimit && lines.every(({ pool }) => pool.status === "open" || pool.status === "target-reached");
  const stepIndex = stage === "cart" ? 0 : stage === "done" ? 2 : 1;

  async function reserveAll() {
    const problem = draftProblem(draft, agreed);
    if (problem) {
      setError(problem);
      return;
    }

    setError("");
    setStage("placing");
    const out: Result[] = [];

    for (const { item, pool } of lines) {
      const qty = pool.status === "open" ? Math.min(item.qty, unitsLeft(pool)) : item.qty;
      if (pool.status !== "open" && pool.status !== "target-reached") {
        out.push({ dealId: pool.id, name: pool.productName, qty, unitLabel: pool.unitLabel, error: "This deal is no longer available." });
        continue;
      }
      if (qty < 1 || (pool.status === "open" && qty < item.qty)) {
        out.push({ dealId: pool.id, name: pool.productName, qty, unitLabel: pool.unitLabel, error: `Only ${Math.max(0, qty)} units remain. Update your cart and try again.` });
        continue;
      }

      try {
        const meta = await dispatch({ type: "JOIN_DEAL", dealId: pool.id, shopId, qty, prefs: draft });
        out.push({
          dealId: pool.id,
          name: pool.productName,
          qty,
          unitLabel: pool.unitLabel,
          error: meta.error,
          filled: !!meta.targetReached,
          waitlisted: !!meta.waitlisted,
        });
      } catch {
        out.push({ dealId: pool.id, name: pool.productName, qty, unitLabel: pool.unitLabel, error: "Couldn't complete this reservation. It remains in your cart." });
      }
    }

    cart.removeMany(out.filter((result) => !result.error).map((result) => result.dealId));
    setResults(out);
    setStage("done");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/owner/pools" className="inline-flex items-center gap-1 text-sm text-ink/50 hover:text-ink">
            <ArrowLeft size={14} /> Keep shopping
          </Link>
          <h1 className="mt-1 text-3xl font-bold text-ink sm:text-4xl">{stage === "done" ? "Reservation results" : "Your cart"}</h1>
        </div>
        <ol className="flex items-center gap-2 text-xs font-semibold" aria-label="Checkout steps">
          {STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-2">
              <span className={clsx("flex h-6 w-6 items-center justify-center rounded-full", index <= stepIndex ? "bg-ember text-white" : "bg-ink/10 text-ink/50")}>{index + 1}</span>
              <span className={index <= stepIndex ? "text-ink" : "text-ink/40"}>{step}</span>
              {index < STEPS.length - 1 && <span className="h-px w-5 bg-ink/15" />}
            </li>
          ))}
        </ol>
      </div>

      {due > 0 && stage !== "done" && (
        <Link href="/owner/payments" className="card flex flex-wrap items-center gap-3 border-ember/40 p-4 text-sm hover:shadow-md">
          <Wallet size={18} className="text-ember" />
          <span className="flex-1"><strong className="text-ink">Also due now: {formatCents(due)}</strong> <span className="text-ink/55">for deals that already filled.</span></span>
          {deadline && <Countdown iso={deadline} className="text-ember-dark" />}
          <span className="font-semibold text-ember-dark">Pay →</span>
        </Link>
      )}

      <AnimatePresence mode="wait">
        {stage === "done" ? (
          <motion.section key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card space-y-4 p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf text-white"><CheckCircle2 size={24} /></span>
              <div>
                <p className="text-lg font-bold text-ink">{results.some((result) => result.error) ? "Some reservations need attention" : "Reserved. You paid R0 today."}</p>
                <p className="text-sm text-ink/55">Successful reservations cost nothing today. You'll be asked to pay when a deal fills.</p>
              </div>
            </div>
            <ul className="divide-y divide-ink/[0.06] rounded-2xl border border-ink/[0.07]">
              {results.map((result) => (
                <li key={result.dealId} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  {result.error ? <XCircle size={18} className="text-red-500" /> : result.filled ? <PartyPopper size={18} className="text-ember" /> : <CheckCircle2 size={18} className="text-leaf" />}
                  <span className="min-w-0 flex-1">
                    <Link href={`/owner/pools/${result.dealId}`} className="font-semibold text-ink hover:underline">
                      {result.qty} {units(result.unitLabel.split(" (")[0], result.qty)} · {result.name}
                    </Link>
                    <span className={clsx("block", result.error ? "text-red-600" : "text-ink/55")}>
                      {result.error ?? (result.filled ? "The deal filled. Pay your share within 48 hours." : result.waitlisted ? "The deal is full, so you're on the waitlist." : "Reserved. Nothing to pay until it fills.")}
                    </span>
                  </span>
                  {result.filled && <Link href="/owner/payments" className="btn-ember px-3 py-1.5 text-xs">Pay now</Link>}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Link href="/owner/pools" className="btn-dark px-5 py-2.5 text-sm">Keep shopping</Link>
              <Link href="/owner" className="btn-outline px-5 py-2.5 text-sm">Go home</Link>
            </div>
          </motion.section>
        ) : cart.items.length === 0 ? (
          <motion.section key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card flex flex-col items-center gap-3 p-10 text-center">
            <ShoppingBag size={34} className="text-ink/20" />
            <p className="text-lg font-semibold text-ink">Your cart is empty</p>
            <p className="max-w-sm text-sm text-ink/55">Add deals from the Buy page. Reserve them together here, and pay nothing until each deal fills.</p>
            <Link href="/owner/pools" className="btn-ember mt-2 px-5 py-2.5 text-sm">Browse deals</Link>
          </motion.section>
        ) : (
          <motion.div key="checkout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              {stage === "cart" ? (
                <section className="card divide-y divide-ink/[0.06]">
                  {lines.map(({ item, pool }) => {
                    const estimate = pool.status === "open" && unitsLeft(pool) > 0 ? lineEstimate(pool, Math.min(item.qty, unitsLeft(pool))) : null;
                    const left = unitsLeft(pool);
                    const full = pool.status === "target-reached";
                    const unavailable = pool.status !== "open" && !full;
                    const unit = pool.unitLabel.split(" (")[0];
                    return (
                      <div key={pool.id} className="flex flex-wrap items-center gap-4 p-4">
                        <Link href={`/owner/pools/${pool.id}`} className="shrink-0 overflow-hidden rounded-xl bg-[#EFEDEA]">
                          <ProductImage name={pool.productName} src={pool.photo} count={itemsPerUnit(pool.unitLabel)} size={80} rounded="rounded-none" />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link href={`/owner/pools/${pool.id}`} className="font-semibold text-ink hover:underline">{pool.productName}</Link>
                          <p className="text-xs text-ink/50">{pool.supplierName} · per {pool.unitLabel}</p>
                          {estimate && <p className="mt-1 text-sm"><span className="num font-bold text-ink">{formatCents(estimate.finalUnit)}</span><span className="num ml-1.5 text-xs text-ink/40 line-through">{formatCents(toCents(pool.retailPrice))}</span><span className="ml-1.5 text-xs text-ink/50">each when full</span></p>}
                          {full ? <p className="mt-1 text-xs font-semibold text-ember-dark">Deal filled — reservation will request a waitlist spot</p>
                            : unavailable ? <p className="mt-1 text-xs font-semibold text-red-600">This deal is no longer available</p>
                              : item.qty > left ? <p className="mt-1 text-xs font-semibold text-ember-dark">Only {left} left; reduce the quantity to continue</p>
                                : estimate && <p className="mt-1 text-xs text-leaf">You save {formatCents(estimate.savingsCents)} vs buying alone</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          {!unavailable && <QtyStepper size="sm" value={item.qty} min={1} max={full ? 99 : Math.max(1, left)} onChange={(quantity) => cart.setQty(pool.id, quantity)} label={`${unit} quantity for ${pool.productName}`} />}
                          {estimate && <div className="w-24 text-right"><p className="num font-semibold text-ink">{formatCents(estimate.totalCents)}</p><p className="text-[11px] text-ink/45">when full</p></div>}
                          <button onClick={() => cart.remove(pool.id)} className="flex h-11 w-11 items-center justify-center rounded-full text-ink/40 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${pool.productName}`}><Trash2 size={16} /></button>
                        </div>
                      </div>
                    );
                  })}
                  {missingCount > 0 && (
                    <div className="flex items-center justify-between gap-3 p-4 text-sm text-red-600">
                      <span>{missingCount} deal{missingCount === 1 ? "" : "s"} in your cart could not be found.</span>
                      <button onClick={() => cart.removeMany(cart.items.filter((item) => !state.pools.some((pool) => pool.id === item.dealId)).map((item) => item.dealId))} className="underline">Remove unavailable</button>
                    </div>
                  )}
                </section>
              ) : (
                <section className="card p-5 sm:p-6">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><Truck size={18} className="text-ember" /> Delivery choices</h2>
                  <p className="mb-4 text-sm text-ink/55">Set once for everything in your cart. You can change them per deal later.</p>
                  <DeliveryChoices shop={shop} value={draft} onChange={(value) => { setPrefs(value); setError(""); }} agreed={agreed} onAgree={(value) => { setAgreed(value); setError(""); }} units={totalUnits} />
                </section>
              )}
            </div>

            <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
              <section className="card space-y-3 p-5">
                <h2 className="font-semibold text-ink">Summary</h2>
                <Row label={`${lines.length} deal${lines.length === 1 ? "" : "s"} · ${totalUnits} units`} value="" />
                <Row label="Buying alone would cost" value={<span className="line-through">{formatCents(totals.alone)}</span>} muted />
                <Row label="You save" value={formatCents(totals.saved)} green />
                <Row label="You'll pay when deals fill" value={formatCents(totals.later)} sub="open deals · includes delivery and service fee" />
                <div className="flex items-center justify-between rounded-xl bg-leaf/10 px-3 py-2.5 font-bold text-leaf"><span>Pay today</span><span className="num text-lg">R0</span></div>
                {!verified && <p className="flex items-start gap-1.5 text-xs text-ember-dark"><ShieldAlert size={14} className="mt-0.5 shrink-0" /> Only verified shops can reserve. <Link href="/owner/compliance" className="underline">Get verified</Link></p>}
                {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
                {stage === "cart" ? (
                  <button disabled={!verified || !canReserve || hasOverLimit} onClick={() => { setError(""); setStage("delivery"); }} className="btn-ember w-full py-3.5 text-sm">
                    Checkout <ArrowRight size={15} />
                  </button>
                ) : (
                  <>
                    <button disabled={!verified || !canReserve || stage === "placing"} onClick={reserveAll} className="btn-ember w-full py-3.5 text-sm">
                      {stage === "placing" ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />} Reserve all · pay R0 today
                    </button>
                    <button onClick={() => setStage("cart")} disabled={stage === "placing"} className="w-full text-center text-sm text-ink/50 underline">Back to cart</button>
                  </>
                )}
              </section>
              <ul className="space-y-1.5 px-1 text-xs text-ink/55">
                <li className="flex items-center gap-2"><Lock size={13} /> Free to reserve. No card needed today.</li>
                <li className="flex items-center gap-2"><Clock size={13} /> When a deal fills you get 48 hours to pay.</li>
                <li className="flex items-center gap-2"><ShieldCheck size={13} className="text-[#0B3D3A]" /> Money held by TradeSafe until delivery.</li>
              </ul>
            </aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, value, sub, muted, green }: { label: string; value: React.ReactNode; sub?: string; muted?: boolean; green?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-ink/65">{label}{sub && <span className="block text-[11px] text-ink/40">{sub}</span>}</span>
      <span className={clsx("num shrink-0 font-semibold", muted ? "text-ink/40" : green ? "text-leaf" : "text-ink")}>{value}</span>
    </div>
  );
}
