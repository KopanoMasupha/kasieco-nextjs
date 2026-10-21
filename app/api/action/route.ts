import { NextResponse } from "next/server";
import "@/lib/server/seedDb"; // registers the demo seed
import { readDB, writeDB, publicState, resetDB, withDBLock } from "@/lib/server/db";
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

  try {
    const result = await withDBLock(() => {
      if (action.type === "RESET_DEMO") return { state: publicState(resetDB()), meta: {} };
      const db = readDB();
      const { db: nextDB, meta } = reduce(db, action);
      writeDB(nextDB);
      return { state: publicState(nextDB), meta };
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update shared database:", error);
    return NextResponse.json({ error: "Couldn't save this change. Please try again." }, { status: 500 });
  }
}
