import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody } from "@/lib/api";
import { AuthError, requireUser } from "@/lib/auth/session";
import { db, tables } from "@/lib/db";
import { getQuote, normalizeSymbol } from "@/lib/market-data";

const schema = z.object({ symbol: z.string().min(1).max(10) });

/** One-click "add to watchlist": uses the user's first list, creating one if needed. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(req, schema);

    let symbol: string;
    try {
      symbol = normalizeSymbol(body.symbol);
      await getQuote(symbol);
    } catch {
      return apiError(404, "unknown_symbol", "Unknown symbol");
    }

    let list = db
      .select()
      .from(tables.watchlists)
      .where(eq(tables.watchlists.userId, user.id))
      .orderBy(asc(tables.watchlists.sortOrder), asc(tables.watchlists.createdAt))
      .all()[0];
    if (!list) {
      list = db
        .insert(tables.watchlists)
        .values({ userId: user.id, name: "My Watchlist", sortOrder: 0 })
        .returning()
        .all()[0]!;
    }

    const existing = db
      .select({ id: tables.watchlistItems.id })
      .from(tables.watchlistItems)
      .where(
        and(
          eq(tables.watchlistItems.watchlistId, list.id),
          eq(tables.watchlistItems.symbol, symbol),
        ),
      )
      .all()[0];
    if (existing) {
      return NextResponse.json({ ok: true, already: true, watchlistName: list.name });
    }

    const count = db
      .select({ id: tables.watchlistItems.id })
      .from(tables.watchlistItems)
      .where(eq(tables.watchlistItems.watchlistId, list.id))
      .all().length;

    db.insert(tables.watchlistItems)
      .values({ watchlistId: list.id, symbol, sortOrder: count })
      .run();
    return NextResponse.json({ ok: true, watchlistName: list.name });
  } catch (err) {
    if (err instanceof AuthError) return apiError(401, "unauthenticated", "Sign in required");
    if (err instanceof z.ZodError) {
      const first = err.issues[0];
      return apiError(400, "invalid_request", first?.message ?? "Invalid request");
    }
    console.error("[api] quick-add failed:", err);
    return apiError(500, "internal", "Something went wrong");
  }
}
