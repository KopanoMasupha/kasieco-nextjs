import { NextResponse } from "next/server";
import { readDB } from "@/lib/server/db";
import { toSessionAccount, verifyCredentials } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

/**
 * Local shop-owner sign-in. Verifies the phone number + PIN against the accounts
 * stored in data/db.json and returns the sanitised account for the browser
 * session. Shoppers don't sign in — they browse /consumer without an account.
 */
export async function POST(req: Request) {
  let body: { phone?: string; pin?: string };
  try {
    body = (await req.json()) as { phone?: string; pin?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const phone = (body.phone || "").trim();
  const pin = (body.pin || "").trim();

  if (!phone || !pin) {
    return NextResponse.json({ error: "Enter your phone number and PIN." }, { status: 400 });
  }

  const db = readDB();
  const account = verifyCredentials(db.accounts, phone, pin);
  if (!account) {
    return NextResponse.json({ error: "Phone number or PIN is incorrect." }, { status: 401 });
  }

  if (account.shopId) {
    const shop = db.shops.find((s) => s.id === account.shopId);
    if (!shop) {
      return NextResponse.json(
        { error: "This shop is no longer registered. Register it again from /owner/register." },
        { status: 403 }
      );
    }
  }

  return NextResponse.json({ account: toSessionAccount(account) });
}
