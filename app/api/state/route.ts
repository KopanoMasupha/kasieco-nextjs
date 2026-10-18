import { NextResponse } from "next/server";
import "@/lib/server/seedDb"; // registers the demo seed
import { readDB, publicState } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = readDB();
  return NextResponse.json(publicState(db));
}
