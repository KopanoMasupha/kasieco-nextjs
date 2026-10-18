"use client";

import { useState } from "react";
import clsx from "clsx";
import { CheckCircle2, Clock, Hourglass, Lock, ShieldCheck } from "lucide-react";
import { Pool, Shop } from "@/lib/types";
import { useStore } from "@/lib/store";
import { formatCents, memberPositions, quoteJoin } from "@/lib/pot";
import { dueText, hoursLeft } from "@/lib/payments";
import TradeSafeCheckout from "./TradeSafeCheckout";

/** The owner's money for one deal: reserved (nothing paid) → pay now → held in escrow. */
export default function DealPaymentCard({ pool, shop }: { pool: Pool; shop: Shop }) {
  const { dispatch } = useStore();
  const [paying, setPaying] = useState<null | { cents: number; qty: number }>(null);
  return (
    <>
      <Card pool={pool} shop={shop} onPay={(cents, qty) => setPaying({ cents, qty })} />
      {/* kept outside the card so it stays open while the card switches to "Paid" */}
      {paying && (
        <TradeSafeCheckout
          amountCents={paying.cents}
          title={`${pool.productName} · ${paying.qty} units`}
          subtitle={`Includes transport and the ${Math.round(pool.serviceFeeRate * 100)}% service fee`}
          onPay={(method) => dispatch({ type: "PAY_DEAL", dealId: pool.id, shopId: shop.id, method })}
          onClose={() => setPaying(null)}
        />
      )}
    </>
  );
}

function Card({ pool, shop, onPay }: { pool: Pool; shop: Shop; onPay: (cents: number, qty: number) => void }) {
  const pos = memberPositions(pool).find((m) => m.shopId === shop.id);
  const waiting = pool.waitlist.find((w) => w.shopId === shop.id);

  if (waiting && !pos)
    return (
      <section className="card flex items-center gap-4 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink/[0.06] text-ink/60">
          <Hourglass size={20} />
        </span>
        <div className="text-sm">
          <p className="font-semibold text-ink">On the waitlist · {waiting.qty} units</p>
          <p className="text-ink/55">If a shop doesn't pay in time, its spot is yours. Nothing to pay until then.</p>
        </div>
      </section>
    );
  if (!pos || pool.status === "cancelled") return null;

  if (pool.status === "open") {
    const est = quoteJoin(pool, shop, 0).estimateCents;
    return (
      <section className="card flex flex-wrap items-center gap-4 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ember/10 text-ember-dark">
          <Lock size={20} />
        </span>
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-ink">{pos.paidCents > 0 ? `Paid ${formatCents(pos.paidCents)} · held by TradeSafe` : `Reserved · nothing to pay yet`}</p>
          <p className="text-ink/55">{pos.paidCents > 0 ? "Your place is kept while the deal fills again." : `When the deal fills you'll pay about ${formatCents(est)} — the final, lowest price.`}</p>
        </div>
      </section>
    );
  }

  if (pos.dueCents > 0) {
    const h = hoursLeft(pool.paymentDueAt) ?? 0;
    return (
      <section className={clsx("card overflow-hidden border-2", h <= 12 ? "border-amber-400" : "border-ember")}>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="eyebrow !text-ember-dark">Deal full — your turn to pay</p>
            <p className="num mt-1 font-display text-3xl font-bold text-ink">{formatCents(pos.dueCents)}</p>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-ink/60">
              <Clock size={13} /> {dueText(pool.paymentDueAt)} · {pos.qty} at the final price
            </p>
          </div>
          <button onClick={() => onPay(pos.dueCents, pos.qty)} className="btn-pill w-full bg-[#0B3D3A] px-6 py-3.5 text-sm text-white hover:bg-[#082e2b] sm:w-auto">
            <ShieldCheck size={16} /> Pay with TradeSafe
          </button>
        </div>
        <p className="border-t border-ink/[0.06] bg-sand-50 px-5 py-2.5 text-xs text-ink/55">Held in escrow by TradeSafe until delivery. Not paid in time? Your spot goes to the waitlist — no money taken.</p>
      </section>
    );
  }

  return (
    <section className="card flex items-center gap-4 border-leaf/30 p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-leaf/10 text-leaf">
        <CheckCircle2 size={20} />
      </span>
      <div className="text-sm">
        <p className="font-semibold text-ink">Paid {formatCents(pos.paidCents)}</p>
        <p className="text-ink/55">{["delivered"].includes(pool.status) ? "Released to the wholesaler and drivers after delivery." : "Held by TradeSafe until your stock is delivered."}</p>
      </div>
    </section>
  );
}
