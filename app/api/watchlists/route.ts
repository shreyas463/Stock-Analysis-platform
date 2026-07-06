import { NextResponse } from "next/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withUser } from "@/lib/api";
import { AuthError, requireUser } from "@/lib/auth/session";
import { db, tables } from "@/lib/db";
import { getProfile, getQuotes, type Quote } from "@/lib/market-data";

export type WatchlistItemView = typeof tables.watchlistItems.$inferSelect & {
  quote: Quote | null;
  name: string | null;
};
export type WatchlistView = typeof tables.watchlists.$inferSelect & {
  items: WatchlistItemView[];
};

/** All of the user's lists, with items and (best-effort) quotes attached. */
export const GET = withUser(async (_req, { user }) => {
  const lists = db
    .select()
    .from(tables.watchlists)
    .where(eq(tables.watchlists.userId, user.id))
    .orderBy(asc(tables.watchlists.sortOrder), asc(tables.watchlists.createdAt))
    .all();

  const listIds = lists.map((l) => l.id);
  const items =
    listIds.length > 0
      ? db
          .select()
          .from(tables.watchlistItems)
          .where(inArray(tables.watchlistItems.watchlistId, listIds))
          .orderBy(asc(tables.watchlistItems.sortOrder), asc(tables.watchlistItems.createdAt))
          .all()
      : [];

  // One batched quote fetch across every symbol; missing quotes become null.
  const quotes = await getQuotes(items.map((i) => i.symbol));

  // Company names, best-effort (profile lookups are cached for an hour).
  const names = new Map<string, string | null>();
  await Promise.all(
    [...new Set(items.map((i) => i.symbol))].map(async (s) => {
      const profile = await getProfile(s).catch(() => null);
      names.set(s, profile?.name ?? null);
    }),
  );

  const watchlists: WatchlistView[] = lists.map((l) => ({
    ...l,
    items: items
      .filter((i) => i.watchlistId === l.id)
      .map((i) => ({
        ...i,
        quote: quotes.get(i.symbol) ?? null,
        name: names.get(i.symbol) ?? null,
      })),
  }));

  return { watchlists };
});

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40, "Keep names under 40 characters"),
});

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { name } = await parseBody(req, createSchema);

    const existing = db
      .select({ id: tables.watchlists.id })
      .from(tables.watchlists)
      .where(and(eq(tables.watchlists.userId, user.id), eq(tables.watchlists.name, name)))
      .all()[0];
    if (existing) return apiError(409, "duplicate", "You already have a watchlist with that name");

    const count = db
      .select({ id: tables.watchlists.id })
      .from(tables.watchlists)
      .where(eq(tables.watchlists.userId, user.id))
      .all().length;

    const created = db
      .insert(tables.watchlists)
      .values({ userId: user.id, name, sortOrder: count })
      .returning()
      .all()[0]!;
    return NextResponse.json({ watchlist: created });
  } catch (err) {
    if (err instanceof AuthError) return apiError(401, "unauthenticated", "Sign in required");
    if (err instanceof z.ZodError) {
      const first = err.issues[0];
      return apiError(400, "invalid_request", first?.message ?? "Invalid request");
    }
    console.error("[api] create watchlist failed:", err);
    return apiError(500, "internal", "Something went wrong");
  }
}
