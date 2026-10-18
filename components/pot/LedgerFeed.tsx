"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { ArrowDownLeft, ArrowUpRight, Banknote, CreditCard, Landmark, Truck, Wheat, Percent, Undo2 } from "lucide-react";
import { Pool, PotTransaction, PAYMENT_METHOD_LABEL } from "@/lib/types";
import { formatCents } from "@/lib/pot";

const METHOD_ICON = { card: CreditCard, eft: Landmark, cash: Banknote } as const;

function txIcon(t: PotTransaction) {
  if (t.type === "contribution") return t.method ? METHOD_ICON[t.method] : ArrowDownLeft;
  if (t.type === "payout-driver") return Truck;
  if (t.type === "payout-supplier") return Wheat;
  if (t.type === "payout-platform") return Percent;
  return Undo2;
}

const TX_LABEL: Record<PotTransaction["type"], string> = {
  contribution: "Paid in",
  rebate: "Rebate",
  refund: "Refund",
  "payout-supplier": "Wholesaler",
  "payout-driver": "Driver",
  "payout-platform": "Service fee",
};

/** `anonymous`: shop owners see other shops as "A shop in Soshanguve", never by name. */
export default function LedgerFeed({ pool, myShopId, limit, anonymous }: { pool: Pool; myShopId?: string; limit?: number; anonymous?: boolean }) {
  const nameFor = (t: PotTransaction) => {
    if (!anonymous || t.shopId === myShopId) return t.shopName;
    const c = pool.commitments.find((x) => x.shopId === t.shopId);
    return `A shop in ${c?.township ?? "the area"}`;
  };
  // remember which rows we've already shown, so only genuinely new ones animate
  const seen = useRef<Set<string> | null>(null);
  const firstRender = seen.current === null;
  if (seen.current === null) seen.current = new Set(pool.ledger.map((t) => t.id));
  useEffect(() => {
    pool.ledger.forEach((t) => seen.current!.add(t.id));
  });

  const rows = [...pool.ledger].reverse().slice(0, limit ?? pool.ledger.length);

  return (
    <ol className="divide-y divide-ink/5" aria-live="polite">
      {rows.map((t) => {
        const isIn = t.type === "contribution";
        const Icon = txIcon(t);
        const fresh = !firstRender && !seen.current!.has(t.id);
        const mine = t.shopId && t.shopId === myShopId;
        return (
          <li key={t.id} className={clsx("flex items-center gap-3 rounded-lg px-1 py-2.5", fresh && "row-in")}>
            <span
              className={clsx(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                isIn ? "bg-leaf/10 text-leaf" : "bg-ember/10 text-ember-dark"
              )}
            >
              <Icon size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {t.shopName ? (
                  <>
                    {nameFor(t)}
                    {mine && <span className="ml-1 text-xs font-semibold text-ember-dark">(you)</span>}
                  </>
                ) : (
                  TX_LABEL[t.type]
                )}
              </p>
              <p className="truncate text-xs text-ink/45">
                {t.note}
                {t.method ? ` · ${PAYMENT_METHOD_LABEL[t.method]}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className={clsx("flex items-center justify-end gap-0.5 text-sm font-bold", isIn ? "text-leaf" : "text-ember-dark")}>
                {isIn ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                {isIn ? "+" : "−"}
                {formatCents(t.amountCents)}
              </p>
              <p className="font-mono text-[10px] text-ink/35" title="Payment reference">
                {t.ref}
              </p>
            </div>
          </li>
        );
      })}
      {rows.length === 0 && <li className="py-4 text-sm text-ink/40">{pool.status === "open" ? "Nothing paid yet — shops pay when the deal fills." : "No payments yet."}</li>}
    </ol>
  );
}
