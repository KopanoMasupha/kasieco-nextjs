import { NextResponse } from "next/server";
import { readDB } from "@/lib/server/db";
import { computeInsights, templateNarrative } from "@/lib/ai/insights";
import { AiReport } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { shopId } = (await req.json()) as { shopId: string };
  const db = readDB();
  const shop = db.shops.find((s) => s.id === shopId);
  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const insights = computeInsights(shopId, {
    shops: db.shops,
    goods: db.goods,
    orders: db.orders,
    listings: db.listings,
  });

  let narrative = templateNarrative(shop, insights);
  let narrativeSource: AiReport["narrativeSource"] = "template";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const prompt = `You are a friendly business assistant for a township (kasi) spaza shop owner in South Africa called ${shop.name}. Based on this stock data, write a warm, plain-language 2-3 sentence report highlighting what needs attention. Be specific and encouraging, not corporate. Data: ${JSON.stringify(
        insights.map((i) => ({ item: i.name, stock: i.stockQty, recentSales: i.unitsSoldRecent, status: i.status, nearbyMatch: i.matchShopName || null }))
      )}`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.content?.find((c: any) => c.type === "text")?.text;
        if (text) {
          narrative = text.trim();
          narrativeSource = "claude";
        }
      }
    } catch {
      // network/API failure — fall back to the template narrative computed above
    }
  }

  const report: AiReport = {
    shopId,
    generatedAt: new Date().toISOString(),
    narrative,
    narrativeSource,
    insights,
  };

  return NextResponse.json(report);
}
