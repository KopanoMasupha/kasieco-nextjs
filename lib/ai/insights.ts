import { Shop, Good, ConsumerOrder, StockListing, StockInsight } from "../types";
import { distanceKm, formatDistance } from "../geo";

interface InsightInputs {
  shops: Shop[];
  goods: Good[];
  orders: ConsumerOrder[];
  listings: StockListing[];
}

const LOW_STOCK_THRESHOLD = 4;
const OVERSTOCK_QTY_THRESHOLD = 14;
const OVERSTOCK_MAX_SALES = 2;

export function computeInsights(shopId: string, data: InsightInputs): StockInsight[] {
  const shop = data.shops.find((s) => s.id === shopId);
  if (!shop) return [];

  const myGoods = data.goods.filter((g) => g.shopId === shopId && !g.hidden);
  const myOrders = data.orders.filter((o) => o.shopId === shopId);

  const insights: StockInsight[] = myGoods.map((g) => {
    const unitsSoldRecent = myOrders.reduce((sum, o) => {
      const item = o.items.find((i) => i.goodId === g.id);
      return sum + (item ? item.qty : 0);
    }, 0);

    if (g.stockQty === 0) {
      return {
        goodId: g.id,
        name: g.name,
        unitsSoldRecent,
        stockQty: g.stockQty,
        status: "low",
        suggestion: `Out of stock and customers are looking for it — restock ${g.name.toLowerCase()} as soon as you can.`,
      };
    }

    if (g.stockQty <= LOW_STOCK_THRESHOLD && unitsSoldRecent > 0) {
      return {
        goodId: g.id,
        name: g.name,
        unitsSoldRecent,
        stockQty: g.stockQty,
        status: "low",
        suggestion: `Only ${g.stockQty} left and it's moving — restock ${g.name.toLowerCase()} soon.`,
      };
    }

    if (g.stockQty >= OVERSTOCK_QTY_THRESHOLD && unitsSoldRecent <= OVERSTOCK_MAX_SALES) {
      // find a nearby shop that could use it: low/zero stock of the same item,
      // or an open "need" listing for it
      const candidates = data.shops
        .filter((s) => s.id !== shopId && s.verificationStatus === "verified")
        .map((other) => {
          const otherGood = data.goods.find(
            (og) => og.shopId === other.id && og.name.toLowerCase() === g.name.toLowerCase()
          );
          const needsIt =
            (otherGood && otherGood.stockQty <= LOW_STOCK_THRESHOLD) ||
            data.listings.some(
              (l) =>
                l.shopId === other.id &&
                l.status === "open" &&
                l.type === "need" &&
                l.item.toLowerCase() === g.name.toLowerCase()
            );
          return {
            shop: other,
            needsIt,
            dist: distanceKm(shop.lat, shop.lng, other.lat, other.lng),
          };
        })
        .filter((c) => c.needsIt)
        .sort((a, b) => a.dist - b.dist);

      const match = candidates[0];
      return {
        goodId: g.id,
        name: g.name,
        unitsSoldRecent,
        stockQty: g.stockQty,
        status: "overstock",
        matchShopId: match?.shop.id,
        matchShopName: match?.shop.name,
        matchDistanceKm: match?.dist,
        suggestion: match
          ? `You're holding ${g.stockQty} ${g.name.toLowerCase()} and it's barely moving. ${match.shop.name} (${formatDistance(match.dist)} away) looks short on it — worth offering a swap.`
          : `You're holding ${g.stockQty} ${g.name.toLowerCase()} and it's barely moving. Consider a promotion or posting it on the exchange.`,
      };
    }

    return {
      goodId: g.id,
      name: g.name,
      unitsSoldRecent,
      stockQty: g.stockQty,
      status: "healthy",
      suggestion: `Stock levels for ${g.name.toLowerCase()} look balanced.`,
    };
  });

  const rank = { low: 0, overstock: 1, healthy: 2 } as const;
  return insights.sort((a, b) => rank[a.status] - rank[b.status]);
}

export function templateNarrative(shop: Shop, insights: StockInsight[]): string {
  const low = insights.filter((i) => i.status === "low");
  const over = insights.filter((i) => i.status === "overstock");

  if (low.length === 0 && over.length === 0) {
    return `${shop.name} is in good shape — nothing urgently low, and nothing sitting unsold. Keep an eye on things as the week goes on.`;
  }

  const parts: string[] = [];
  if (low.length > 0) {
    const names = low.slice(0, 2).map((i) => i.name.toLowerCase()).join(" and ");
    parts.push(`${names} ${low.length > 1 ? "are" : "is"} running low and selling well — worth restocking soon`);
  }
  if (over.length > 0) {
    const top = over[0];
    parts.push(
      top.matchShopName
        ? `you're sitting on surplus ${top.name.toLowerCase()} that ${top.matchShopName} nearby could use`
        : `you're sitting on surplus ${top.name.toLowerCase()} that isn't moving`
    );
  }
  return `Here's what stands out this week: ${parts.join(", and ")}.`;
}
