import { Shop, Good, StockListing, StockInsight } from "../types";
import { distanceKm, formatDistance } from "../geo";

interface InsightInputs {
  shops: Shop[];
  goods: Good[];
  listings: StockListing[];
}

const LOW_COVER_DAYS = 4; // runs out within ~4 days at the current pace
const OVERSTOCK_COVER_DAYS = 45; // about six weeks of stock sitting on the shelf

/**
 * Stock tracking from what the owner logs ("Record a sale" on My stock):
 * sales pace = units sold in the last 7 days ÷ 7, days of cover = stock ÷ pace.
 */
export function computeInsights(shopId: string, data: InsightInputs): StockInsight[] {
  const shop = data.shops.find((s) => s.id === shopId);
  if (!shop) return [];

  const myGoods = data.goods.filter((g) => g.shopId === shopId && !g.hidden);

  const insights: StockInsight[] = myGoods.map((g) => {
    const perDay = g.soldLast7Days / 7;
    const daysOfCover = perDay > 0 ? Math.round((g.stockQty / perDay) * 10) / 10 : null;
    const base = { goodId: g.id, name: g.name, unitsSoldRecent: g.soldLast7Days, stockQty: g.stockQty, daysOfCover };
    const item = g.name.toLowerCase();

    if (g.stockQty === 0) {
      return {
        ...base,
        status: "low" as const,
        suggestion:
          g.soldLast7Days > 0
            ? `Sold out — you moved ${g.soldLast7Days} last week, so you're losing sales every day. Restock ${item} or find it on the exchange.`
            : `Sold out. Restock ${item} if customers still ask for it.`,
      };
    }

    if (daysOfCover !== null && daysOfCover <= LOW_COVER_DAYS) {
      return {
        ...base,
        status: "low" as const,
        suggestion: `About ${Math.max(1, Math.round(daysOfCover))} day${Math.round(daysOfCover) === 1 ? "" : "s"} left at your current pace — restock ${item} soon.`,
      };
    }

    if (daysOfCover === null || daysOfCover >= OVERSTOCK_COVER_DAYS) {
      // look for a nearby verified shop that's short on the same item or asked for it
      const candidates = data.shops
        .filter((s) => s.id !== shopId && s.verificationStatus === "verified")
        .map((other) => {
          const theirs = data.goods.find((og) => og.shopId === other.id && og.name.toLowerCase() === item);
          const theirCover = theirs && theirs.soldLast7Days > 0 ? theirs.stockQty / (theirs.soldLast7Days / 7) : null;
          const needsIt =
            (theirs && (theirs.stockQty === 0 || (theirCover !== null && theirCover <= LOW_COVER_DAYS))) ||
            data.listings.some(
              (l) => l.shopId === other.id && l.status === "open" && l.type === "need" && l.item.toLowerCase() === item
            );
          return { shop: other, needsIt, dist: distanceKm(shop.lat, shop.lng, other.lat, other.lng) };
        })
        .filter((c) => c.needsIt)
        .sort((a, b) => a.dist - b.dist);

      const match = candidates[0];
      const sitting = daysOfCover === null ? "and nothing sold last week" : `— that's ${Math.round(daysOfCover)} days of stock`;
      return {
        ...base,
        status: "overstock" as const,
        matchShopId: match?.shop.id,
        matchShopName: match?.shop.name,
        matchDistanceKm: match?.dist,
        suggestion: match
          ? `${g.stockQty} on the shelf ${sitting}. ${match.shop.name} (${formatDistance(match.dist)} away) is short on it — offer a swap.`
          : `${g.stockQty} on the shelf ${sitting}. Post it on the exchange or run a special.`,
      };
    }

    return {
      ...base,
      status: "healthy" as const,
      suggestion: `${Math.round(daysOfCover)} days of stock at your current pace — looking balanced.`,
    };
  });

  const rank = { low: 0, overstock: 1, healthy: 2 } as const;
  return insights.sort((a, b) => rank[a.status] - rank[b.status]);
}

export function templateNarrative(shop: Shop, insights: StockInsight[]): string {
  const low = insights.filter((i) => i.status === "low");
  const over = insights.filter((i) => i.status === "overstock");

  if (low.length === 0 && over.length === 0) {
    return `${shop.name} is in good shape this week — nothing about to run out and nothing gathering dust.`;
  }

  const parts: string[] = [];
  if (low.length > 0) {
    const names = low.slice(0, 2).map((i) => i.name.toLowerCase()).join(" and ");
    parts.push(`${names} ${low.length > 1 ? "need" : "needs"} restocking soon`);
  }
  if (over.length > 0) {
    const withMatch = over.find((i) => i.matchShopName);
    const top = withMatch || over[0];
    parts.push(
      top.matchShopName
        ? `your extra ${top.name.toLowerCase()} could go to ${top.matchShopName} down the road`
        : `${top.name.toLowerCase()} is sitting on the shelf`
    );
  }
  return `This week: ${parts.join(", and ")}.`;
}
