"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowDownLeft, ArrowUpRight, Clock, Lock, ShieldCheck, Store, Truck } from "lucide-react";
import { useStore, useLiveRefresh, useMyShop } from "@/lib/store";
import { formatCents } from "@/lib/pot";
import { amountDue, dealsToPay, dueText, earnedAsDropPoint, feesDue, heldInEscrow, isMoneyIn, paymentsFor, PAYMENT_TX_LABEL } from "@/lib/payments";
import { Fee, PAYMENT_METHOD_LABEL, Pool } from "@/lib/types";
import TradeSafeCheckout from "@/components/pay/TradeSafeCheckout";
import { PageSkeleton } from "@/components/Skeleton";

type Paying = { kind: "deal"; pool: Pool; cents: number } | { kind: "fee"; fee: Fee };

/** Everything money for one shop. MzansiConnect has no wallet: TradeSafe holds payments in escrow. */
export default function PaymentsPage() {
  useLiveRefresh(5000);
  const { state, dispatch, loading } = useStore();
  const shop = useMyShop();
  const [paying, setPaying] = useState<Paying | null>(null);
  if (!shop) return loading ? <PageSkeleton /> : null;

  const toPay = dealsToPay(state.pools, shop.id);
  const fees = feesDue(state.fees, shop.id);
  const due = amountDue(state.pools, state.fees, shop.id);
  const held = heldInEscrow(state.pools, shop.id);
  const earned = earnedAsDropPoint(state.payments, shop.id);
  const history = paymentsFor(state.payments, shop.id);
  const reserved = state.pools.filter((p) => p.status === "open" && p.commitments.some((c) => c.shopId === shop.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-ink">Payments</h1>
          <p className="flex items-center gap-1.5 text-sm text-ink/55">
            <ShieldCheck size={14} className="text-[#0B3D3A]" /> Held by TradeSafe escrow — never by MzansiConnect.
          </p>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className={clsx("rounded-2xl p-5", due > 0 ? "bg-ember text-white" : "bg-white ring-1 ring-ink/[0.07]")}>
          <p className={clsx("text-xs", due > 0 ? "text-white/75" : "text-ink/50")}>Due now</p>
          <p className="num font-display text-3xl font-bold">{formatCents(due)}</p>
          <p className={clsx("text-[11px]", due > 0 ? "text-white/75" : "text-ink/45")}>{due > 0 ? `${toPay.length + fees.length} to pay` : "Nothing to pay"}</p>
        </div>
        <div className="rounded-2xl bg-[#0B3D3A] p-5 text-white">
          <p className="flex items-center gap-1 text-xs text-white/70">
            <Lock size={12} /> In escrow
          </p>
          <p className="num font-display text-3xl font-bold">{formatCents(held)}</p>
          <p className="text-[11px] text-white/60">Released after delivery</p>
        </div>
        <div className="rounded-2xl bg-white p-5 ring-1 ring-ink/[0.07]">
          <p className="text-xs text-ink/50">Reserved, not paid</p>
          <p className="num font-display text-3xl font-bold text-ink">{reserved.length}</p>
          <p className="text-[11px] text-ink/45">deal{reserved.length === 1 ? "" : "s"} still filling · R0 paid</p>
        </div>
      </section>

      {(toPay.length > 0 || fees.length > 0) && (
        <section className="card divide-y divide-ink/[0.06]">
          <h2 className="px-5 py-3.5 font-semibold text-ink">To pay</h2>
          {toPay.map(({ pool, pos }) => (
            <div key={pool.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ember/10 text-ember-dark">
                <Truck size={18} />
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <Link href={`/owner/pools/${pool.id}`} className="font-semibold text-ink hover:underline">
                  {pool.productName} · {pos.qty} units
                </Link>
                <p className="flex items-center gap-1 text-xs text-ink/55">
                  <Clock size={11} /> {dueText(pool.paymentDueAt)}
                </p>
              </div>
              <span className="num font-semibold text-ink">{formatCents(pos.dueCents)}</span>
              <button onClick={() => setPaying({ kind: "deal", pool, cents: pos.dueCents })} className="btn-pill bg-[#0B3D3A] px-4 py-2 text-sm text-white hover:bg-[#082e2b]">
                Pay
              </button>
            </div>
          ))}
          {fees.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Store size={18} />
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold text-ink">{f.kind === "drop-point" ? "Drop-point fee" : "Re-delivery fee"}</p>
                <p className="text-xs text-ink/55">{f.note}</p>
              </div>
              <span className="num font-semibold text-ink">{formatCents(f.amountCents)}</span>
              <button onClick={() => setPaying({ kind: "fee", fee: f })} className="btn-pill bg-[#0B3D3A] px-4 py-2 text-sm text-white hover:bg-[#082e2b]">
                Pay
              </button>
            </div>
          ))}
        </section>
      )}

      {earned > 0 && (
        <section className="card flex items-center gap-4 border-leaf/30 p-5">
          <Store size={20} className="text-leaf" />
          <p className="flex-1 text-sm text-ink/70">Earned as a drop point, paid to your bank by TradeSafe</p>
          <span className="num font-display text-xl font-bold text-leaf">{formatCents(earned)}</span>
        </section>
      )}

      <section className="card p-5">
        <h2 className="mb-3 font-semibold text-ink">History</h2>
        <ol className="divide-y divide-ink/5">
          {history.map((t) => {
            const deal = t.dealId ? state.pools.find((p) => p.id === t.dealId) : undefined;
            const back = isMoneyIn(t);
            return (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <span className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", back ? "bg-leaf/10 text-leaf" : "bg-[#0B3D3A]/10 text-[#0B3D3A]")}>
                  {back ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{PAYMENT_TX_LABEL[t.type]}</p>
                  <p className="truncate text-xs text-ink/45">
                    {deal ? (
                      <Link href={`/owner/pools/${deal.id}`} className="underline">
                        {deal.productName}
                      </Link>
                    ) : (
                      t.note
                    )}
                    {t.method ? ` · ${PAYMENT_METHOD_LABEL[t.method]}` : ""} · {new Date(t.createdAt).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={clsx("num text-sm font-bold", back ? "text-leaf" : "text-ink")}>
                    {back ? "+" : "−"}
                    {formatCents(t.amountCents)}
                  </p>
                  <p className="font-mono text-[10px] text-ink/35">{t.ref}</p>
                </div>
              </li>
            );
          })}
          {history.length === 0 && <li className="py-6 text-center text-sm text-ink/45">No payments yet. You pay only when a deal you reserved fills.</li>}
        </ol>
      </section>

      {paying && (
        <TradeSafeCheckout
          amountCents={paying.kind === "deal" ? paying.cents : paying.fee.amountCents}
          title={paying.kind === "deal" ? paying.pool.productName : paying.fee.kind === "drop-point" ? "Drop-point fee" : "Re-delivery fee"}
          onPay={(method) =>
            paying.kind === "deal"
              ? dispatch({ type: "PAY_DEAL", dealId: paying.pool.id, shopId: shop.id, method })
              : dispatch({ type: "PAY_FEE", feeId: paying.fee.id, shopId: shop.id, method })
          }
          onClose={() => setPaying(null)}
        />
      )}
    </div>
  );
}
