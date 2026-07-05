import { and, desc, eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { getQuotes, type Quote } from "@/lib/market-data";
import { notionalCents } from "@/lib/money";
import { sweepOpenOrders } from "@/lib/services/trading";

export const DEFAULT_STARTING_CASH_CENTS = 100_000_00; // $100,000 paper money

export function ensureDefaultPortfolio(userId: string): typeof tables.portfolios.$inferSelect {
  const existing = db
    .select()
    .from(tables.portfolios)
    .where(eq(tables.portfolios.userId, userId))
    .all()[0];
  if (existing) return existing;

  return db.transaction((tx) => {
    const portfolio = tx
      .insert(tables.portfolios)
      .values({ userId, name: "Paper Portfolio", cashCents: DEFAULT_STARTING_CASH_CENTS })
      .returning()
      .all()[0]!;
    tx.insert(tables.cashLedger)
      .values({
        portfolioId: portfolio.id,
        deltaCents: DEFAULT_STARTING_CASH_CENTS,
        balanceAfterCents: DEFAULT_STARTING_CASH_CENTS,
        reason: "deposit",
        refId: null,
      })
      .run();
    return portfolio;
  });
}

export type PositionView = {
  symbol: string;
  qtyE4: number;
  avgCostCents: number;
  costBasisCents: number;
  lastPriceCents: number | null;
  marketValueCents: number | null;
  unrealizedPnlCents: number | null;
  unrealizedPnlPct: number | null;
  dayChangeCents: number | null;
  dayChangePct: number | null;
  realizedPnlCents: number;
  weight: number | null; // fraction of total portfolio value
  quote: Quote | null;
};

export type PortfolioOverview = {
  portfolioId: string;
  name: string;
  cashCents: number;
  positionsValueCents: number;
  totalValueCents: number;
  investedCostCents: number;
  unrealizedPnlCents: number;
  realizedPnlCents: number;
  dayChangeCents: number;
  dayChangePct: number;
  totalDepositsCents: number;
  totalReturnCents: number;
  totalReturnPct: number;
  buyingPowerCents: number;
  positions: PositionView[];
  anySynthetic: boolean;
  anyStale: boolean;
  asOf: number;
};

export async function getPortfolioOverview(userId: string): Promise<PortfolioOverview> {
  const portfolio = ensureDefaultPortfolio(userId);

  // Opportunistically match resting limit/stop orders before valuing.
  await sweepOpenOrders(portfolio.id);

  // Re-read: the sweep may have moved cash/positions.
  const freshPortfolio = db
    .select()
    .from(tables.portfolios)
    .where(eq(tables.portfolios.id, portfolio.id))
    .all()[0]!;

  const positions = db
    .select()
    .from(tables.positions)
    .where(eq(tables.positions.portfolioId, portfolio.id))
    .all();

  const quotes = await getQuotes(positions.map((p) => p.symbol));

  let positionsValue = 0;
  let investedCost = 0;
  let unrealized = 0;
  let dayChange = 0;
  let prevValue = 0;
  let anySynthetic = false;
  let anyStale = false;

  const views: PositionView[] = positions.map((p) => {
    const quote = quotes.get(p.symbol) ?? null;
    const costBasis = notionalCents(p.avgCostCents, p.qtyE4);
    investedCost += costBasis;
    if (quote) {
      anySynthetic ||= quote.synthetic;
      anyStale ||= quote.stale;
      const value = notionalCents(quote.priceCents, p.qtyE4);
      const prevVal = notionalCents(quote.prevCloseCents, p.qtyE4);
      positionsValue += value;
      prevValue += prevVal;
      unrealized += value - costBasis;
      dayChange += value - prevVal;
      return {
        symbol: p.symbol,
        qtyE4: p.qtyE4,
        avgCostCents: p.avgCostCents,
        costBasisCents: costBasis,
        lastPriceCents: quote.priceCents,
        marketValueCents: value,
        unrealizedPnlCents: value - costBasis,
        unrealizedPnlPct: costBasis > 0 ? (value - costBasis) / costBasis : null,
        dayChangeCents: value - prevVal,
        dayChangePct: prevVal > 0 ? (value - prevVal) / prevVal : null,
        realizedPnlCents: p.realizedPnlCents,
        weight: null,
        quote,
      };
    }
    // Quote unavailable: show the position without a made-up price.
    return {
      symbol: p.symbol,
      qtyE4: p.qtyE4,
      avgCostCents: p.avgCostCents,
      costBasisCents: costBasis,
      lastPriceCents: null,
      marketValueCents: null,
      unrealizedPnlCents: null,
      unrealizedPnlPct: null,
      dayChangeCents: null,
      dayChangePct: null,
      realizedPnlCents: p.realizedPnlCents,
      weight: null,
      quote: null,
    };
  });

  const totalValue = freshPortfolio.cashCents + positionsValue;
  for (const v of views) {
    if (v.marketValueCents !== null && totalValue > 0) v.weight = v.marketValueCents / totalValue;
  }
  views.sort((a, b) => (b.marketValueCents ?? 0) - (a.marketValueCents ?? 0));

  const ledger = db
    .select()
    .from(tables.cashLedger)
    .where(eq(tables.cashLedger.portfolioId, portfolio.id))
    .all();
  const totalDeposits = ledger
    .filter((l) => l.reason === "deposit")
    .reduce((a, l) => a + l.deltaCents, 0);

  const realizedTotal = db
    .select()
    .from(tables.trades)
    .where(eq(tables.trades.portfolioId, portfolio.id))
    .all()
    .reduce((a, t) => a + (t.realizedPnlCents ?? 0), 0);

  const totalReturn = totalValue - totalDeposits;

  // Persist a daily snapshot (idempotent per UTC day).
  const today = new Date().toISOString().slice(0, 10);
  db.insert(tables.portfolioSnapshots)
    .values({
      portfolioId: portfolio.id,
      date: today,
      totalValueCents: totalValue,
      cashCents: freshPortfolio.cashCents,
    })
    .onConflictDoUpdate({
      target: [tables.portfolioSnapshots.portfolioId, tables.portfolioSnapshots.date],
      set: { totalValueCents: totalValue, cashCents: freshPortfolio.cashCents },
    })
    .run();

  return {
    portfolioId: portfolio.id,
    name: freshPortfolio.name,
    cashCents: freshPortfolio.cashCents,
    positionsValueCents: positionsValue,
    totalValueCents: totalValue,
    investedCostCents: investedCost,
    unrealizedPnlCents: unrealized,
    realizedPnlCents: realizedTotal,
    dayChangeCents: dayChange,
    dayChangePct: prevValue > 0 ? dayChange / prevValue : 0,
    totalDepositsCents: totalDeposits,
    totalReturnCents: totalReturn,
    totalReturnPct: totalDeposits > 0 ? totalReturn / totalDeposits : 0,
    buyingPowerCents: freshPortfolio.cashCents,
    positions: views,
    anySynthetic,
    anyStale,
    asOf: Date.now(),
  };
}

export function getTradeHistory(portfolioId: string, limit = 100) {
  return db
    .select()
    .from(tables.trades)
    .where(eq(tables.trades.portfolioId, portfolioId))
    .orderBy(desc(tables.trades.executedAt))
    .limit(limit)
    .all();
}

export function getOrderHistory(portfolioId: string, limit = 100) {
  return db
    .select()
    .from(tables.orders)
    .where(eq(tables.orders.portfolioId, portfolioId))
    .orderBy(desc(tables.orders.createdAt))
    .limit(limit)
    .all();
}

export function getOpenOrders(portfolioId: string) {
  return db
    .select()
    .from(tables.orders)
    .where(and(eq(tables.orders.portfolioId, portfolioId), eq(tables.orders.status, "open")))
    .orderBy(desc(tables.orders.createdAt))
    .all();
}

export function getSnapshots(portfolioId: string, limitDays = 365) {
  const rows = db
    .select()
    .from(tables.portfolioSnapshots)
    .where(eq(tables.portfolioSnapshots.portfolioId, portfolioId))
    .orderBy(desc(tables.portfolioSnapshots.date))
    .limit(limitDays)
    .all();
  return rows.reverse();
}

export function getPortfolioForUser(userId: string) {
  return ensureDefaultPortfolio(userId);
}
