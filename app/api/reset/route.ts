import { NextResponse } from "next/server";
import { resetDB } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: { accessCode?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (payload.accessCode !== "GOV2026") {
    return NextResponse.json({ error: "Verifier access code is incorrect" }, { status: 403 });
  }
  const { accounts, ...state } = resetDB();
  return NextResponse.json({ state });
}
