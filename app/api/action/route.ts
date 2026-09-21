import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/server/db";
import { reduce } from "@/lib/server/reducer";
import { ServerAction } from "@/lib/server/actions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let action: ServerAction;
  try {
    action = (await req.json()) as ServerAction;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const db = readDB();
  const { db: nextDB, meta } = reduce(db, action);
  writeDB(nextDB);

  // never ship account records (PIN hashes) back to the browser
  const { accounts, ...publicState } = nextDB;
  return NextResponse.json({ state: publicState, meta });
}
