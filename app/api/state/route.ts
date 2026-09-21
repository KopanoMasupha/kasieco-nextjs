import { NextResponse } from "next/server";
import { readDB } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  // accounts (with their PIN hashes) never leave the server
  const { accounts, ...publicState } = readDB();
  return NextResponse.json(publicState);
}
