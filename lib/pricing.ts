import { Pool, PriceTier } from "./types";

export function totalQty(pool: Pool): number {
  return pool.commitments.reduce((sum, c) => sum + c.qty, 0);
}

export function currentTier(pool: Pool): PriceTier {
  const qty = totalQty(pool);
  const sorted = [...pool.tiers].sort((a, b) => a.minQty - b.minQty);
  let tier = sorted[0];
  for (const t of sorted) {
    if (qty >= t.minQty) tier = t;
  }
  return tier;
}

export function nextTier(pool: Pool): PriceTier | null {
  const qty = totalQty(pool);
  const sorted = [...pool.tiers].sort((a, b) => a.minQty - b.minQty);
  for (const t of sorted) {
    if (t.minQty > qty) return t;
  }
  return null;
}

export function unitsToNextTier(pool: Pool): number {
  const nt = nextTier(pool);
  if (!nt) return 0;
  return Math.max(0, nt.minQty - totalQty(pool));
}

export function rebateFor(pool: Pool, paidPrice: number): number {
  const cur = currentTier(pool).price;
  return Math.max(0, paidPrice - cur);
}

export function formatRand(n: number): string {
  return `R${n.toLocaleString("en-ZA", { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}
