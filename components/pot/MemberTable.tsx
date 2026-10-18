"use client";

import clsx from "clsx";
import { Pool } from "@/lib/types";
import { formatCents, memberPositions } from "@/lib/pot";
import { units } from "@/lib/units";

/** Each shop's position in the pot: what it paid, what it owes at today's price, and its credit. */
export default function MemberTable({ pool, myShopId, anonymous }: { pool: Pool; myShopId?: string; anonymous?: boolean }) {
  const rows = memberPositions(pool).map((r) => (anonymous && r.shopId !== myShopId ? { ...r, shopName: `A shop in ${r.township}` } : r));
  const status = (r: (typeof rows)[number]) =>
    pool.status === "cancelled"
      ? { text: r.paidCents > 0 ? "Refunded" : "Closed", cls: "text-ink/45" }
      : r.paidCents > 0 && r.paid
      ? { text: "Paid", cls: "text-leaf" }
      : pool.status === "open"
      ? { text: "Reserved", cls: "text-ink/50" }
      : { text: "Due", cls: "text-ember-dark" };
  return (
    <div>
      {/* phones: one card per shop */}
      <ul className="space-y-2 sm:hidden">
        {rows.map((r) => (
          <li key={r.shopId} className={clsx("rounded-xl2 p-3 text-sm", r.shopId === myShopId ? "bg-ember/5" : "bg-sand-50")}>
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 font-medium text-ink">
                  <span className="truncate">{r.shopName}</span>
                  {r.shopId === myShopId && <span className="text-xs font-semibold text-ember-dark">(you)</span>}
                </span>
                <span className="text-xs text-ink/40">
                  {r.qty} {units(pool.unitLabel, r.qty)}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className={clsx("text-xs font-semibold", status(r).cls)}>{status(r).text}</span>
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <span className="text-ink/50">
                Paid <span className="block text-sm font-semibold tabular-nums text-ink">{formatCents(r.paidCents)}</span>
              </span>
              <span className="text-ink/50">
                Share <span className="block text-sm font-semibold tabular-nums text-ink">{formatCents(r.owedCents)}</span>
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto sm:block">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="text-left text-xs text-ink/45">
            <th className="pb-2 font-medium">Shop</th>
            <th className="pb-2 text-right font-medium">Units</th>
            <th className="pb-2 text-right font-medium">Paid</th>
            <th className="pb-2 text-right font-medium" title="Goods + delivery + service fee at the final price">
              Share
            </th>
            <th className="pb-2 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/5">
          {rows.map((r) => (
            <tr key={r.shopId} className={clsx(r.shopId === myShopId && "bg-ember/5")}>
              <td className="py-2.5 pr-2">
                <span className="flex items-center gap-1.5 font-medium text-ink">
                  {r.shopName}
                  {r.shopId === myShopId && <span className="text-xs font-semibold text-ember-dark">(you)</span>}
                </span>
                {!(anonymous && r.shopId !== myShopId) && <span className="text-xs text-ink/40">{r.township}</span>}
              </td>
              <td className="py-2.5 text-right tabular-nums">{r.qty}</td>
              <td className="py-2.5 text-right tabular-nums">{formatCents(r.paidCents)}</td>
              <td className="py-2.5 text-right tabular-nums">
                {formatCents(r.owedCents)}
              </td>
              <td className="py-2.5 text-right tabular-nums">
                <span className={clsx("text-xs font-semibold", status(r).cls)}>{status(r).text}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
