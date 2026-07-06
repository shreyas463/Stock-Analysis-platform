import { and, desc, eq, lt } from "drizzle-orm";
import { withUser } from "@/lib/api";
import { db, tables } from "@/lib/db";
import { ensureDefaultPortfolio } from "@/lib/services/portfolio";

/** Trade history with executedAt cursor pagination (?limit=&before=). */
export const GET = withUser(async (req, { user }) => {
  const portfolio = ensureDefaultPortfolio(user.id);
  const url = new URL(req.url);

  const rawLimit = Number(url.searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.floor(rawLimit), 1), 200) : 50;

  const rawBefore = Number(url.searchParams.get("before"));
  const before = Number.isFinite(rawBefore) && rawBefore > 0 ? rawBefore : null;

  const where = before
    ? and(eq(tables.trades.portfolioId, portfolio.id), lt(tables.trades.executedAt, before))
    : eq(tables.trades.portfolioId, portfolio.id);

  const trades = db
    .select()
    .from(tables.trades)
    .where(where)
    .orderBy(desc(tables.trades.executedAt))
    .limit(limit)
    .all();

  const lastRow = trades[trades.length - 1];
  return {
    trades,
    nextCursor: trades.length === limit && lastRow ? lastRow.executedAt : null,
  };
});
