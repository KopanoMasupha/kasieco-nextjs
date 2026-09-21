import { NextResponse } from "next/server";
import { readDB } from "@/lib/server/db";
import { DEMO_PIN } from "@/lib/seed";

export const dynamic = "force-dynamic";

/**
 * The demo shop-owner credentials shown on the sign-in page so the app can be
 * used without registering. Only accounts flagged `demo` are listed — PIN hashes
 * are never returned. Prototype only: never expose credentials like this in
 * production.
 */
export async function GET() {
  const db = readDB();
  const shopNameById = new Map(db.shops.map((s) => [s.id, s.name]));

  // demo-flagged owner accounts only — enough to log in and explore locally
  const accounts = db.accounts
    .filter((a) => a.demo && a.role === "owner")
    .map((a) => ({
      name: a.name,
      phone: a.phone,
      shopName: a.shopId ? shopNameById.get(a.shopId) ?? null : null,
    }));

  return NextResponse.json({ accounts, demoPin: DEMO_PIN });
}
