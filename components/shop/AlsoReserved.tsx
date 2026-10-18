"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Pool } from "@/lib/types";
import { formatCents, toCents, unitCentsFor } from "@/lib/pot";
import { alsoReserved, itemsPerUnit } from "@/lib/products";
import ProductImage from "@/components/ProductImage";

/** Cross-sell from real behaviour: other open deals that shops in this deal also reserved. */
export default function AlsoReserved({ pool, pools }: { pool: Pool; pools: Pool[] }) {
  const picks = alsoReserved(pool, pools);
  if (!picks.length) return null;
  return (
    <section className="card p-5">
      <h2 className="font-semibold text-ink">Shops in this deal also reserved</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {picks.map(({ pool: p, overlap }) => {
          const best = unitCentsFor(p, p.minQty);
          return (
            <Link key={p.id} href={`/owner/pools/${p.id}`} className="group flex items-center gap-3 rounded-xl2 border border-ink/[0.07] p-3 hover:border-ink/20">
              <ProductImage name={p.productName} src={p.photo} count={itemsPerUnit(p.unitLabel)} size={56} rounded="rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{p.productName}</p>
                <p className="text-sm">
                  <span className="num text-xs text-ink/40 line-through">{formatCents(toCents(p.retailPrice))}</span>
                  <span className="num ml-1.5 font-bold text-leaf">{formatCents(best)}</span>
                </p>
                <p className="text-[11px] text-ink/50">
                  {overlap} shop{overlap === 1 ? "" : "s"} from this deal {overlap === 1 ? "is" : "are"} in it
                </p>
              </div>
              <ArrowRight size={15} className="shrink-0 text-ink/25 transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
