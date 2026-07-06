/**
 * Shape of the aggregate GET /api/dashboard payload. Type-only module shared
 * by the route handler (server) and the dashboard client components.
 */

export type QuoteLite = {
  symbol: string;
  priceCents: number;
  changeCents: number;
  changePct: number; // fraction
  synthetic: boolean;
  stale: boolean;
  asOf: number;
};

export type DashboardPositionRow = {
  symbol: string;
  marketValueCents: number | null;
  dayChangeCents: number | null;
  dayChangePct: number | null;
  unrealizedPnlCents: number | null;
  unrealizedPnlPct: number | null;
};

export type DashboardTradeRow = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  qtyE4: number;
  priceCents: number;
  executedAt: number;
};

export type DashboardAlertNote = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  createdAt: number;
};

export type DashboardMover = {
  symbol: string;
  name: string;
  priceCents: number;
  changePct: number;
  synthetic: boolean;
};

export type DashboardSummary = {
  totalValueCents: number;
  dayChangeCents: number;
  dayChangePct: number;
  totalReturnCents: number;
  totalReturnPct: number;
  totalDepositsCents: number;
  cashCents: number;
  buyingPowerCents: number;
  unrealizedPnlCents: number;
  investedCostCents: number;
  anySynthetic: boolean;
  anyStale: boolean;
  asOf: number;
};

export type DashboardPayload = {
  demoMode: boolean;
  summary: DashboardSummary;
  /** Top positions by market value (max 5). */
  positions: DashboardPositionRow[];
  positionCount: number;
  /** User's watchlist symbols, top 6 by |day change %|. */
  watchlistMovers: QuoteLite[];
  recentTrades: DashboardTradeRow[];
  openOrdersCount: number;
  alertsEnabledCount: number;
  alertNotifications: DashboardAlertNote[];
  movers: { gainers: DashboardMover[]; losers: DashboardMover[] };
  /** SPY then QQQ, when quotes are available. */
  indexes: QuoteLite[];
  snapshots: { date: string; totalValueCents: number }[];
};
