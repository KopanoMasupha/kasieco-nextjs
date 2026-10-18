import { Good, Shop, StockListing, ExchangeThread } from "./types";
import { distanceKm } from "./geo";

export interface ExchangeMatch {
  listing: StockListing; // the other shop's listing
  mine: StockListing; // my listing it matches
  dist: number;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** My open "have" ↔ their open "need" (and the reverse), nearest first. */
export function findMatches(shop: Shop, listings: StockListing[]): ExchangeMatch[] {
  const results: ExchangeMatch[] = [];
  for (const mine of listings.filter((l) => l.shopId === shop.id && l.status === "open")) {
    const opposite = mine.type === "have" ? "need" : "have";
    for (const other of listings) {
      if (other.shopId === shop.id || other.status !== "open" || other.type !== opposite) continue;
      if (!same(other.item, mine.item)) continue;
      results.push({ listing: other, mine, dist: distanceKm(shop.lat, shop.lng, other.lat, other.lng) });
    }
  }
  return results.sort((a, b) => a.dist - b.dist);
}

export function threadsFor(shopId: string, threads: ExchangeThread[]) {
  return threads.filter((t) => t.shopAId === shopId || t.shopBId === shopId);
}

/**
 * Fair value of an item: the average shelf price that verified kasi shops on
 * the platform charge for it. Used to show both sides of a swap in rands so
 * neither owner is short-changed — "willing buyer, willing seller", but informed.
 */
export function fairUnitPrice(itemName: string, goods: Good[], verifiedShopIds: Set<string>): number | null {
  const prices = goods
    .filter((g) => verifiedShopIds.has(g.shopId) && same(g.name, itemName))
    .map((g) => g.price);
  if (prices.length === 0) return null;
  return Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
}

/** Items that have a known fair price, for the offer builder's pick-lists. */
export function pricedItems(goods: Good[], verifiedShopIds: Set<string>): string[] {
  const names = new Map<string, string>();
  for (const g of goods) if (verifiedShopIds.has(g.shopId)) names.set(g.name.toLowerCase(), g.name);
  return Array.from(names.values()).sort();
}
