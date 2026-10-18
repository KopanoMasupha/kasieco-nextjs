import { NextResponse } from "next/server";
import "@/lib/server/seedDb";
import { readDB } from "@/lib/server/db";
import { computeInsights, templateNarrative } from "@/lib/ai/insights";
import { askClaude } from "@/lib/server/claude";
import { AiReport } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { shopId } = (await req.json()) as { shopId: string };
  const db = readDB();
  const shop = db.shops.find((s) => s.id === shopId);
  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const insights = computeInsights(shopId, { shops: db.shops, goods: db.goods, listings: db.listings });

  let narrative = templateNarrative(shop, insights);
  let narrativeSource: AiReport["narrativeSource"] = "template";

  const fromClaude = await askClaude(
    "You are a friendly stock assistant for a township (kasi) shop owner in South Africa. Write 2–3 warm, plain-language sentences about what needs attention this week. Use rands (R). No headings, no bullet points.",
    [
      {
        role: "user",
        content: `Shop: ${shop.name}. Stock data: ${JSON.stringify(
          insights.map((i) => ({
            item: i.name,
            inStock: i.stockQty,
            soldLast7Days: i.unitsSoldRecent,
            daysOfCover: i.daysOfCover,
            status: i.status,
            nearbyShopThatNeedsIt: i.matchShopName || null,
          }))
        )}`,
      },
    ],
    250
  );
  if (fromClaude) {
    narrative = fromClaude;
    narrativeSource = "claude";
  }

  const report: AiReport = { shopId, generatedAt: new Date().toISOString(), narrative, narrativeSource, insights };
  return NextResponse.json(report);
}
