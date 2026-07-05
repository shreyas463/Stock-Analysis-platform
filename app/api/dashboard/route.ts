import { and, desc, eq } from "drizzle-orm";
import { withUser } from "@/lib/api";
import { db, tables } from "@/lib/db";
import { getMovers, getQuotes, isDemoMode, type Quote } from "@/lib/market-data";
import {
  getOpenOrders,
  getPortfolioOverview,
  getSnapshots,
  getTradeHistory,
} from "@/lib/services/portfolio";
import type { DashboardPayload, QuoteLite } from "@/components/dashboard/types";

function toQuoteLite(q: Quote): QuoteLite {
  return {
    symbol: q.symbol,
    priceCents: q.priceCents,
    changeCents: q.changeCents,
    changePct: q.changePct,
    synthetic: q.synthetic,
    stale: q.stale,
    asOf: q.asOf,
  };
}

export const GET = withUser(async (_req, { user }): Promise<DashboardPayload> => {
  const overview = await getPortfolioOverview(user.id);

  // Watchlist symbols across all of the user's watchlists (ownership-scoped join).
  const watchRows = db
    .select({ symbol: tables.watchlistItems.symbol })
    .from(tables.watchlistItems)
    .innerJoin(tables.watchlists, eq(tables.watchlistItems.watchlistId, tables.watchlists.id))
    .where(eq(tables.watchlists.userId, user.id))
    .all();
  const watchSymbols = [...new Set(watchRows.map((r) => r.symbol))];

  const [watchQuotes, movers, indexQuotes] = await Promise.all([
    watchSymbols.length > 0 ? getQuotes(watchSymbols) : Promise.resolve(new Map<string, Quote>()),
    getMovers(),
    getQuotes(["SPY", "QQQ"]),
  ]);

  const watchlistMovers = watchSymbols
    .map((s) => watchQuotes.get(s))
    .filter((q): q is Quote => q != null)
    .map(toQuoteLite)
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, 6);

  const recentTrades = getTradeHistory(overview.portfolioId, 5).map((t) => ({
    id: t.id,
    symbol: t.symbol,
    side: t.side,
    qtyE4: t.qtyE4,
    priceCents: t.priceCents,
    executedAt: t.executedAt,
  }));

  const openOrdersCount = getOpenOrders(overview.portfolioId).length;

  const alertsEnabledCount = db
    .select({ id: tables.alerts.id })
    .from(tables.alerts)
    .where(and(eq(tables.alerts.userId, user.id), eq(tables.alerts.enabled, true)))
    .all().length;

  const alertNotifications = db
    .select()
    .from(tables.notifications)
    .where(and(eq(tables.notifications.userId, user.id), eq(tables.notifications.kind, "alert")))
    .orderBy(desc(tables.notifications.createdAt))
    .limit(3)
    .all()
    .map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      href: n.href,
      createdAt: n.createdAt,
    }));

  const snapshots = getSnapshots(overview.portfolioId).map((s) => ({
    date: s.date,
    totalValueCents: s.totalValueCents,
  }));

  return {
    demoMode: isDemoMode(),
    summary: {
      totalValueCents: overview.totalValueCents,
      dayChangeCents: overview.dayChangeCents,
      dayChangePct: overview.dayChangePct,
      totalReturnCents: overview.totalReturnCents,
      totalReturnPct: overview.totalReturnPct,
      totalDepositsCents: overview.totalDepositsCents,
      cashCents: overview.cashCents,
      buyingPowerCents: overview.buyingPowerCents,
      unrealizedPnlCents: overview.unrealizedPnlCents,
      investedCostCents: overview.investedCostCents,
      anySynthetic: overview.anySynthetic,
      anyStale: overview.anyStale,
      asOf: overview.asOf,
    },
    positions: overview.positions.slice(0, 5).map((p) => ({
      symbol: p.symbol,
      marketValueCents: p.marketValueCents,
      dayChangeCents: p.dayChangeCents,
      dayChangePct: p.dayChangePct,
      unrealizedPnlCents: p.unrealizedPnlCents,
      unrealizedPnlPct: p.unrealizedPnlPct,
    })),
    positionCount: overview.positions.length,
    watchlistMovers,
    recentTrades,
    openOrdersCount,
    alertsEnabledCount,
    alertNotifications,
    movers,
    indexes: ["SPY", "QQQ"]
      .map((s) => indexQuotes.get(s))
      .filter((q): q is Quote => q != null)
      .map(toQuoteLite),
    snapshots,
  };
});
