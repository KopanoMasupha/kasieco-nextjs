/**
 * What an item IS: the picture to draw, what's in the pack, and what a shop can
 * earn reselling it. Everything here is derived from real data (the deal, the
 * shops' own shelf prices) — no invented reviews, counts or fake urgency.
 */
import { Good, Pool } from "./types";
import { toCents, unitCentsFor } from "./pot";

export type ProductKind =
  | "maize"
  | "oil"
  | "sugar"
  | "rice"
  | "flour"
  | "bread"
  | "airtime"
  | "candles"
  | "soap"
  | "kota"
  | "chips"
  | "bunny"
  | "tomato"
  | "onion"
  | "spinach"
  | "wors"
  | "chicken"
  | "mince"
  | "generic";

const RULES: [RegExp, ProductKind][] = [
  [/maize|mielie|pap/i, "maize"],
  [/oil/i, "oil"],
  [/sugar/i, "sugar"],
  [/rice/i, "rice"],
  [/flour/i, "flour"],
  [/bread|loaf/i, "bread"],
  [/airtime|data|voucher/i, "airtime"],
  [/candle/i, "candles"],
  [/soap/i, "soap"],
  [/kota/i, "kota"],
  [/chips|russian/i, "chips"],
  [/bunny/i, "bunny"],
  [/tomato/i, "tomato"],
  [/onion/i, "onion"],
  [/spinach|morogo/i, "spinach"],
  [/wors|sausage/i, "wors"],
  [/chicken/i, "chicken"],
  [/mince|beef/i, "mince"],
];

export function productKind(name: string): ProductKind {
  return RULES.find(([re]) => re.test(name))?.[1] ?? "generic";
}

/** "Cooking oil 750ml" → { name: "Cooking oil", size: "750ml" } */
export function splitSize(name: string): { name: string; size?: string } {
  const m = name.match(/\(?\s*(\d+(?:[.,]\d+)?\s?(?:kg|g|ml|l|L))\s*\)?/);
  if (!m) return { name: name.replace(/\s*\(.*\)\s*/, "").trim() };
  return { name: name.replace(m[0], "").replace(/\s+/g, " ").trim(), size: m[1].replace(/\s/g, "") };
}

/** How many sellable items are in one deal unit: "case (12 × 750ml)" → 12, "bag (10kg)" → 1. */
export function itemsPerUnit(unitLabel: string): number {
  const m = unitLabel.match(/(\d+)\s*[×x]/);
  return m ? parseInt(m[1], 10) : 1;
}

const ITEM_WORD: Partial<Record<ProductKind, string>> = { oil: "bottle", maize: "bag", sugar: "bag", rice: "bag", flour: "bag" };

/** Plain facts for the "What you get" panel. */
export function packFacts(pool: Pool): string[] {
  const kind = productKind(pool.productName);
  const per = itemsPerUnit(pool.unitLabel);
  const { size } = splitSize(pool.productName);
  const word = ITEM_WORD[kind] ?? "item";
  const unit = pool.unitLabel.split(" (")[0];
  const facts = [
    per > 1 ? `${per} × ${size ?? ""} ${word}s in every ${unit}`.replace(/\s+/g, " ") : `One ${size ?? ""} ${word} per ${unit}`.replace(/\s+/g, " "),
    `${pool.unitWeightKg} kg per ${unit} — we plan the vehicle for it`,
    `Delivered to your door within ${pool.deliveryWithinDays} days after it fills`,
    `From ${pool.supplierName}${pool.supplierVerified ? ", a verified partner wholesaler" : ""}`,
  ];
  return facts;
}


/**
 * The average price verified kasi shops on MzansiConnect charge for ONE item
 * of this product, from their own stock lists. Null when nobody lists it.
 */
export function kasiShelfPrice(pool: Pool, goods: Good[], verifiedShopIds: Set<string>): number | null {
  // same kind of product AND the same pack size ("White sugar 2kg" ↔ "Sugar (2kg)")
  const kind = productKind(pool.productName);
  const size = splitSize(pool.productName).size?.toLowerCase();
  const prices = goods
    .filter((g) => verifiedShopIds.has(g.shopId) && productKind(g.name) === kind && kind !== "generic" && splitSize(g.name).size?.toLowerCase() === size)
    .map((g) => g.price);
  if (!prices.length) return null;
  return prices.reduce((a, b) => a + b, 0) / prices.length;
}

/** What one deal unit really costs a shop once it fills: goods + 2% fee + its share of transport. */
export function landedUnitCents(pool: Pool): number {
  const unit = unitCentsFor(pool, pool.minQty);
  return Math.round(unit * (1 + pool.serviceFeeRate) + pool.deliveryFeeCents / Math.max(1, pool.minQty));
}

/** Resale maths: sell each item at the kasi shelf price → profit per deal unit. */
export function resaleProfit(pool: Pool, goods: Good[], verifiedShopIds: Set<string>) {
  const shelf = kasiShelfPrice(pool, goods, verifiedShopIds);
  if (shelf == null) return null;
  const per = itemsPerUnit(pool.unitLabel);
  const revenueCents = Math.round(toCents(shelf) * per);
  const costCents = landedUnitCents(pool);
  const profitCents = revenueCents - costCents;
  if (profitCents <= 0) return null;
  return { shelfCents: toCents(shelf), per, revenueCents, costCents, profitCents, marginPct: Math.round((profitCents / revenueCents) * 100) };
}

/** Time words for social proof: "just now", "12 min ago", "3 h ago", "2 days ago". */
export function ago(iso: string, now = Date.now()) {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/** The quantity most shops reserve in this deal (median), for a "Most shops take N" default. */
export function popularQty(pool: Pool): number | null {
  const q = pool.commitments.map((c) => c.qty).sort((a, b) => a - b);
  if (q.length < 3) return null;
  return q[Math.floor(q.length / 2)];
}

/** Honest badges: only what the deal's numbers say. */
export function dealBadges(pool: Pool, now = Date.now()) {
  const qty = pool.commitments.reduce((s, c) => s + c.qty, 0);
  const fill = qty / Math.max(1, pool.minQty);
  const hoursLeft = (new Date(pool.closesAt).getTime() - now) / 3600000;
  const badges: { label: string; tone: "ember" | "leaf" | "ink" }[] = [];
  if (pool.status !== "open") return badges;
  if (fill >= 0.7) badges.push({ label: "Almost full", tone: "ember" });
  if (hoursLeft > 0 && hoursLeft <= 48) badges.push({ label: "Closing soon", tone: "ink" });
  if (now - new Date(pool.createdAt).getTime() < 2 * 86400000 && fill < 0.7) badges.push({ label: "New", tone: "leaf" });
  return badges;
}

// ---------------- shop psychology, all from real records ----------------

/** A wholesaler's star rating from shops whose stock actually arrived. */
export function wholesalerRating(pools: Pool[], wholesalerId: string) {
  const all = pools.filter((p) => p.wholesalerId === wholesalerId).flatMap((p) => (p.ratings ?? []).map((r) => ({ ...r, productName: p.productName })));
  if (!all.length) return null;
  const avg = all.reduce((s, r) => s + r.stars, 0) / all.length;
  const recent = all.filter((r) => r.comment).sort((a, b) => b.at.localeCompare(a.at));
  return { avg: Math.round(avg * 10) / 10, count: all.length, recent };
}

/** Momentum: units reserved and distinct shops that looked, in the last 24 hours. */
export function momentum(pool: Pool, now = Date.now()) {
  const day = now - 86400000;
  const reserved24h = pool.commitments.filter((c) => new Date(c.joinedAt).getTime() >= day).reduce((s, c) => s + c.qty, 0);
  const viewers24h = Object.values(pool.views ?? {}).filter((iso) => new Date(iso).getTime() >= day).length;
  return { reserved24h, viewers24h };
}

/** "Shops in this deal also reserved…": other open deals sharing the most shops with this one. */
export function alsoReserved(pool: Pool, pools: Pool[], limit = 2) {
  const members = new Set(pool.commitments.map((c) => c.shopId));
  return pools
    .filter((p) => p.id !== pool.id && p.status === "open")
    .map((p) => ({ pool: p, overlap: p.commitments.filter((c) => members.has(c.shopId)).length }))
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit);
}

/** What kasi shops have saved together: (alone price − locked group price) × units, on paid deals. */
export function platformSavingsCents(pools: Pool[]) {
  const paidSteps = new Set(["payment-confirmed", "ordered", "scheduled", "out-for-delivery", "delivered"]);
  return pools
    .filter((p) => paidSteps.has(p.status))
    .reduce((s, p) => {
      const qty = p.commitments.reduce((a, c) => a + c.qty, 0);
      return s + Math.max(0, toCents(p.retailPrice) - unitCentsFor(p, p.minQty)) * qty;
    }, 0);
}
