import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody } from "@/lib/api";
import { AuthError, requireUser } from "@/lib/auth/session";
import { db, tables } from "@/lib/db";
import { getQuote, normalizeSymbol, ProviderError } from "@/lib/market-data";

function ownedList(userId: string, listId: string) {
  return db
    .select()
    .from(tables.watchlists)
    .where(and(eq(tables.watchlists.id, listId), eq(tables.watchlists.userId, userId)))
    .all()[0];
}

function handleError(err: unknown): NextResponse {
  if (err instanceof AuthError) return apiError(401, "unauthenticated", "Sign in required");
  if (err instanceof z.ZodError) {
    const first = err.issues[0];
    return apiError(400, "invalid_request", first?.message ?? "Invalid request");
  }
  console.error("[api] watchlist item mutation failed:", err);
  return apiError(500, "internal", "Something went wrong");
}

const targetCents = z.number().int().positive().max(100_000_000).nullish();

const addSchema = z.object({
  symbol: z.string().min(1).max(10),
  note: z.string().trim().max(500).nullish(),
  targetEntryCents: targetCents,
  targetExitCents: targetCents,
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await parseBody(req, addSchema);

    const list = ownedList(user.id, id);
    if (!list) return apiError(404, "not_found", "Watchlist not found");

    // Validate the symbol against real data — never add tickers we can't quote.
    let symbol: string;
    try {
      symbol = normalizeSymbol(body.symbol);
      await getQuote(symbol);
    } catch {
      return apiError(404, "unknown_symbol", "Unknown symbol");
    }

    const existing = db
      .select({ id: tables.watchlistItems.id })
      .from(tables.watchlistItems)
      .where(
        and(eq(tables.watchlistItems.watchlistId, id), eq(tables.watchlistItems.symbol, symbol)),
      )
      .all()[0];
    if (existing) return apiError(409, "duplicate", `${symbol} is already in this list`);

    const count = db
      .select({ id: tables.watchlistItems.id })
      .from(tables.watchlistItems)
      .where(eq(tables.watchlistItems.watchlistId, id))
      .all().length;

    const item = db
      .insert(tables.watchlistItems)
      .values({
        watchlistId: id,
        symbol,
        note: body.note ?? null,
        targetEntryCents: body.targetEntryCents ?? null,
        targetExitCents: body.targetExitCents ?? null,
        sortOrder: count,
      })
      .returning()
      .all()[0]!;
    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof ProviderError) return apiError(404, "unknown_symbol", "Unknown symbol");
    return handleError(err);
  }
}

const editSchema = z.object({
  itemId: z.string().min(1),
  note: z.string().trim().max(500).nullish(),
  targetEntryCents: targetCents,
  targetExitCents: targetCents,
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await parseBody(req, editSchema);

    const list = ownedList(user.id, id);
    if (!list) return apiError(404, "not_found", "Watchlist not found");

    const item = db
      .select()
      .from(tables.watchlistItems)
      .where(
        and(eq(tables.watchlistItems.id, body.itemId), eq(tables.watchlistItems.watchlistId, id)),
      )
      .all()[0];
    if (!item) return apiError(404, "not_found", "Watchlist item not found");

    const set: Partial<typeof tables.watchlistItems.$inferInsert> = {};
    if ("note" in body)
      set.note = body.note === undefined ? item.note : (body.note ?? null) || null;
    if ("targetEntryCents" in body)
      set.targetEntryCents =
        body.targetEntryCents === undefined ? item.targetEntryCents : body.targetEntryCents;
    if ("targetExitCents" in body)
      set.targetExitCents =
        body.targetExitCents === undefined ? item.targetExitCents : body.targetExitCents;

    if (Object.keys(set).length > 0) {
      db.update(tables.watchlistItems).set(set).where(eq(tables.watchlistItems.id, item.id)).run();
    }

    const updated = db
      .select()
      .from(tables.watchlistItems)
      .where(eq(tables.watchlistItems.id, item.id))
      .all()[0];
    return NextResponse.json({ item: updated });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const itemId = new URL(req.url).searchParams.get("itemId");
    if (!itemId) return apiError(400, "invalid_request", "itemId is required");

    const list = ownedList(user.id, id);
    if (!list) return apiError(404, "not_found", "Watchlist not found");

    const result = db
      .delete(tables.watchlistItems)
      .where(and(eq(tables.watchlistItems.id, itemId), eq(tables.watchlistItems.watchlistId, id)))
      .run();
    if (result.changes === 0) return apiError(404, "not_found", "Watchlist item not found");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
