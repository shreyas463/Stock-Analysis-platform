import type { Quote } from "@/lib/market-data/types";

/** JSON-safe row shapes as returned by the portfolio/orders/trades APIs. */

export type OrderRow = {
  id: string;
  portfolioId: string;
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop" | "stop_limit";
  qtyE4: number;
  limitPriceCents: number | null;
  stopPriceCents: number | null;
  status: "open" | "filled" | "cancelled" | "rejected" | "expired";
  statusReason: string | null;
  idempotencyKey: string | null;
  createdAt: number;
  updatedAt: number;
};

export type TradeRow = {
  id: string;
  orderId: string;
  portfolioId: string;
  symbol: string;
  side: "buy" | "sell";
  qtyE4: number;
  priceCents: number;
  quotePriceCents: number;
  realizedPnlCents: number | null;
  executedAt: number;
};

export type OrdersResponse = { open: OrderRow[]; recent: OrderRow[] };
export type TradesResponse = { trades: TradeRow[]; nextCursor: number | null };

export type SnapshotPoint = { date: string; totalValueCents: number; cashCents: number };
export type BenchmarkPoint = { date: string; valueCents: number };
export type HistoryResponse = { snapshots: SnapshotPoint[]; benchmark: BenchmarkPoint[] };

export type PlaceOrderResponse = {
  orderId: string;
  status: "filled" | "open" | "rejected";
  tradeId?: string;
  fillPriceCents?: number;
  realizedPnlCents?: number | null;
  message: string;
};

export type QuoteResponse = { quote: Quote; name: string | null };

export type MarketStatusResponse = {
  open: boolean;
  session: "pre" | "regular" | "after" | "closed";
  nextChangeAt: number | null;
  asOf: number;
  demoMode: boolean;
};

export const ORDER_TYPE_LABELS: Record<OrderRow["type"], string> = {
  market: "Market",
  limit: "Limit",
  stop: "Stop",
  stop_limit: "Stop-limit",
};
