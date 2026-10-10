import { NextResponse } from "next/server";
import { readDB } from "@/lib/server/db";
import { computeInsights, templateNarrative } from "@/lib/ai/insights";
import { AiReport } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let payload: { shopId?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const shopId = payload.shopId;
  if (!shopId) return NextResponse.json({ error: "shopId is required" }, { status: 400 });
  const db = readDB();
  const shop = db.shops.find((s) => s.id === shopId);
  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const insights = computeInsights(shopId, {
    shops: db.shops,
    goods: db.goods,
    sales: db.sales ?? [],
    listings: db.listings,
  });

  let narrative = templateNarrative(shop.name, insights);
  let narrativeSource: AiReport["narrativeSource"] = "template";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const prompt = `You are a friendly business assistant for a township (kasi) spaza shop owner in South Africa called ${shop.name}. Based on this stock data, write a warm, plain-language 2-3 sentence report highlighting what needs attention. Be specific and encouraging, not corporate. Data: ${JSON.stringify(
        insights.map((i) => ({ item: i.name, stock: i.stockQty, recentSales: i.unitsSoldRecent, daysOfStockLeft: i.daysOfStockLeft, status: i.status, nearbyMatch: i.matchShopName || null }))
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
      if (!res.ok) {
        console.error("Anthropic report request failed", res.status, await res.text());
      } else {
        const data = await res.json();
        const text = data?.content?.find((c: { type?: string; text?: string }) => c.type === "text")?.text;
        if (text) {
          narrative = text.trim();
          narrativeSource = "claude";
        } else {
          console.error("Anthropic report response contained no text");
        }
      }
    } catch {
      console.error("Anthropic report request could not be completed");
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
