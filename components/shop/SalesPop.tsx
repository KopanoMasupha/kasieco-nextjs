"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useStore, useMyShop } from "@/lib/store";
import { units } from "@/lib/units";
import { itemsPerUnit } from "@/lib/products";
import ProductImage from "@/components/ProductImage";

interface Pop {
  key: string;
  dealId: string;
  productName: string;
  unitLabel: string;
  photo?: string;
  township: string;
  qty: number;
}

/**
 * "A shop in Soshanguve just reserved 6 cases" — a small live pop-up when another
 * shop really reserves units while you're using the app. Never invented, never
 * replayed: only reservations that happen after you opened the page.
 */
export default function SalesPop() {
  const { state } = useStore();
  const shop = useMyShop();
  const seen = useRef<Set<string> | null>(null);
  const [pop, setPop] = useState<Pop | null>(null);

  useEffect(() => {
    const now: Pop[] = [];
    for (const p of state.pools)
      for (const c of p.commitments)
        now.push({ key: `${p.id}:${c.shopId}:${c.qty}`, dealId: p.id, productName: p.productName, unitLabel: p.unitLabel, photo: p.photo, township: c.township, qty: c.qty, ...(c.shopId === shop?.id ? { mine: true } : {}) } as Pop);
    if (!seen.current) {
      if (state.pools.length) seen.current = new Set(now.map((x) => x.key));
      return;
    }
    const fresh = now.filter((x) => !seen.current!.has(x.key) && !(x as Pop & { mine?: boolean }).mine);
    now.forEach((x) => seen.current!.add(x.key));
    if (fresh.length) setPop(fresh[fresh.length - 1]);
  }, [state.pools, shop?.id]);

  useEffect(() => {
    if (!pop) return;
    const t = setTimeout(() => setPop(null), 6000);
    return () => clearTimeout(t);
  }, [pop]);

  const unit = pop?.unitLabel.split(" (")[0] ?? "";
  return (
    <div className="pointer-events-none fixed bottom-24 left-4 z-[850] w-[min(340px,calc(100vw-2rem))] lg:bottom-6 lg:left-64" aria-live="polite">
      <AnimatePresence>
        {pop && (
          <motion.div
            key={pop.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="pointer-events-auto flex items-center gap-3 rounded-xl2 border border-ink/[0.08] bg-white p-3 shadow-xl"
          >
            <ProductImage name={pop.productName} src={pop.photo} count={itemsPerUnit(pop.unitLabel)} size={48} rounded="rounded-xl" />
            <Link href={`/owner/pools/${pop.dealId}`} className="min-w-0 flex-1 text-sm leading-snug" onClick={() => setPop(null)}>
              <span className="font-semibold text-ink">A shop in {pop.township}</span> <span className="text-ink/70">just reserved {pop.qty} {units(unit, pop.qty)} of {pop.productName}</span>
              <span className="mt-0.5 block text-[11px] font-medium text-ember-dark">See the deal →</span>
            </Link>
            <button onClick={() => setPop(null)} className="self-start rounded-full p-1 text-ink/35 hover:bg-sand-100" aria-label="Dismiss">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
