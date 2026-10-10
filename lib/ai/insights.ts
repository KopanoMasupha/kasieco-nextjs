import { Good, Shop, StockInsight, StockSale, StockListing } from "../types";
import { distanceKm, formatDistance } from "../geo";

interface InsightInputs {
  shops: Shop[];
  goods: Good[];
  sales: StockSale[];
  listings: StockListing[];
  now?: number;
}

const LOW_DAYS_THRESHOLD = 4;
const OVERSTOCK_DAYS_THRESHOLD = 42;
const SALES_WINDOW_DAYS = 7;

export function computeInsights(shopId: string, data: InsightInputs): StockInsight[] {
  const shop = data.shops.find((candidate) => candidate.id === shopId);
  if (!shop) return [];
  const now = data.now ?? Date.now();
  const windowStart = now - SALES_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const myGoods = data.goods.filter((good) => good.shopId === shopId && !good.hidden);

  const insights = myGoods.map((good) => {
    const unitsSoldRecent = data.sales
      .filter((sale) => sale.shopId === shopId && sale.goodId === good.id && Date.parse(sale.createdAt) >= windowStart)
      .reduce((sum, sale) => sum + sale.qty, 0);
    const dailySales = unitsSoldRecent / SALES_WINDOW_DAYS;
    const daysOfStockLeft = dailySales > 0 ? good.stockQty / dailySales : null;
    const status: StockInsight["status"] =
      good.stockQty === 0 || (daysOfStockLeft !== null && daysOfStockLeft <= LOW_DAYS_THRESHOLD)
        ? "low"
        : daysOfStockLeft !== null && daysOfStockLeft > OVERSTOCK_DAYS_THRESHOLD
          ? "overstock"
          : "healthy";

    let match: { shop: Shop; distance: number } | undefined;
    if (status === "overstock") {
      match = data.shops
        .filter((other) => other.id !== shopId && other.verificationStatus === "verified")
        .map((other) => {
          const otherGood = data.goods.find((item) =>
            item.shopId === other.id && item.name.toLowerCase() === good.name.toLowerCase()
          );
          const needs = (otherGood && otherGood.stockQty <= 4) ||
            data.listings.some((listing) =>
              listing.shopId === other.id && listing.status === "open" &&
              listing.type === "need" && listing.item.toLowerCase() === good.name.toLowerCase()
            );
          return { shop: other, distance: distanceKm(shop.lat, shop.lng, other.lat, other.lng), needs };
        })
        .filter((candidate) => candidate.needs)
        .sort((left, right) => left.distance - right.distance)[0];
    }

    const suggestion = status === "low"
      ? good.stockQty === 0
        ? `${good.name} is sold out. Restock as soon as you can.`
        : `${good.name} has about ${Math.floor(daysOfStockLeft ?? 0)} days of stock left. Consider restocking soon.`
      : status === "overstock"
        ? match
          ? `${good.name} has about ${Math.floor(daysOfStockLeft ?? 0)} days of stock. ${match.shop.name} (${formatDistance(match.distance)} away) looks short on it — offer a swap.`
          : `${good.name} has about ${Math.floor(daysOfStockLeft ?? 0)} days of stock. Consider a promotion or offer it on the exchange.`
        : "Stock levels look balanced based on the last seven days of recorded sales.";

    return {
      goodId: good.id,
      name: good.name,
      unitsSoldRecent,
      stockQty: good.stockQty,
      daysOfStockLeft,
      status,
      suggestion,
      matchShopId: match?.shop.id,
      matchShopName: match?.shop.name,
      matchDistanceKm: match?.distance,
    };
  });

  const rank = { low: 0, overstock: 1, healthy: 2 } as const;
  return insights.sort((left, right) => rank[left.status] - rank[right.status]);
}

export function templateNarrative(shopName: string, insights: StockInsight[]): string {
  const low = insights.filter((insight) => insight.status === "low");
  const over = insights.filter((insight) => insight.status === "overstock");
  if (low.length === 0 && over.length === 0) {
    return `${shopName} is in good shape based on the sales recorded this week. Keep recording sales to keep the stock estimate useful.`;
  }
  const parts: string[] = [];
  if (low.length) parts.push(`${low.slice(0, 2).map((item) => item.name.toLowerCase()).join(" and ")} may need restocking soon`);
  if (over.length) {
    const top = over[0];
    parts.push(top.matchShopName
      ? `${top.matchShopName} nearby may be short on surplus ${top.name.toLowerCase()}`
      : `${top.name.toLowerCase()} may be sitting on the shelf`);
  }
  return `${shopName}: ${parts.join("; ")}. This estimate uses only sales you recorded in the last seven days.`;
}
