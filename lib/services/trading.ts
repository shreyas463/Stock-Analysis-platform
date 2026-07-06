import { and, eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { getMarketStatus, getQuote, normalizeSymbol, type Quote } from "@/lib/market-data";
import { averageCostCents, notionalCents, realizedPnlCents } from "@/lib/money";

/**
 * Paper-trading engine.
 *
 * Execution model (documented in ARCHITECTURE.md):
 * - Market orders fill immediately at the current quote ± slippage
 *   (5 bps against the trader), even when the exchange is closed — in that
 *   case the fill uses the last available price and the order is annotated.
 * - Limit/stop orders rest as `open` and are matched against fresh quotes by
 *   `sweepOpenOrders`, which runs whenever the owning portfolio is viewed.
 * - Every fill runs inside a single SQLite transaction touching cash,
 *   position, order, trade, and ledger together; a crash can never create or
 *   destroy money.
 * - Duplicate submissions are rejected via per-portfolio idempotency keys.
 */

export const SLIPPAGE_BPS = 5;

export type PlaceOrderInput = {
  portfolioId: string;
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop" | "stop_limit";
  qtyE4: number;
  limitPriceCents?: number | null;
  stopPriceCents?: number | null;
  idempotencyKey?: string | null;
};

export class TradeError extends Error {
  constructor(
    message: string,
    public readonly code:
      "insufficient_funds" | "insufficient_shares" | "invalid_order" | "duplicate" | "not_found",
  ) {
    super(message);
  }
}

function applySlippage(priceCents: number, side: "buy" | "sell"): number {
  const factor = side === "buy" ? 1 + SLIPPAGE_BPS / 10_000 : 1 - SLIPPAGE_BPS / 10_000;
  return Math.max(1, Math.round(priceCents * factor));
}

function validateOrder(input: PlaceOrderInput): void {
  if (!Number.isInteger(input.qtyE4) || input.qtyE4 <= 0) {
    throw new TradeError("Quantity must be a positive number of shares", "invalid_order");
  }
  if (input.qtyE4 > 1_000_000 * 10_000) {
    throw new TradeError("Quantity exceeds the maximum order size", "invalid_order");
  }
  if (input.type === "limit" || input.type === "stop_limit") {
    if (!input.limitPriceCents || input.limitPriceCents <= 0) {
      throw new TradeError("Limit orders require a limit price", "invalid_order");
    }
  }
  if (input.type === "stop" || input.type === "stop_limit") {
    if (!input.stopPriceCents || input.stopPriceCents <= 0) {
      throw new TradeError("Stop orders require a stop price", "invalid_order");
    }
  }
}

/**
 * Fill an order inside a transaction. Caller must have verified trigger
 * conditions; `fillPriceCents` already includes slippage.
 */
function executeFill(
  orderId: string,
  portfolioId: string,
  symbol: string,
  side: "buy" | "sell",
  qtyE4: number,
  fillPriceCents: number,
  quotePriceCents: number,
  note?: string,
): { tradeId: string; realizedPnlCents: number | null } {
  return db.transaction((tx) => {
    const portfolio = tx
      .select()
      .from(tables.portfolios)
      .where(eq(tables.portfolios.id, portfolioId))
      .all()[0];
    if (!portfolio) throw new TradeError("Portfolio not found", "not_found");

    const cost = notionalCents(fillPriceCents, qtyE4);
    const position = tx
      .select()
      .from(tables.positions)
      .where(
        and(eq(tables.positions.portfolioId, portfolioId), eq(tables.positions.symbol, symbol)),
      )
      .all()[0];

    let realized: number | null = null;

    if (side === "buy") {
      if (portfolio.cashCents < cost) {
        throw new TradeError(
          `Insufficient buying power: order costs more than available cash`,
          "insufficient_funds",
        );
      }
      const newCash = portfolio.cashCents - cost;
      tx.update(tables.portfolios)
        .set({ cashCents: newCash })
        .where(eq(tables.portfolios.id, portfolioId))
        .run();
      tx.insert(tables.cashLedger)
        .values({
          portfolioId,
          deltaCents: -cost,
          balanceAfterCents: newCash,
          reason: "trade_buy",
          refId: orderId,
        })
        .run();
      if (position) {
        tx.update(tables.positions)
          .set({
            qtyE4: position.qtyE4 + qtyE4,
            avgCostCents: averageCostCents(
              position.qtyE4,
              position.avgCostCents,
              qtyE4,
              fillPriceCents,
            ),
            updatedAt: Date.now(),
          })
          .where(eq(tables.positions.id, position.id))
          .run();
      } else {
        tx.insert(tables.positions)
          .values({
            portfolioId,
            symbol,
            qtyE4,
            avgCostCents: fillPriceCents,
            updatedAt: Date.now(),
          })
          .run();
      }
    } else {
      if (!position || position.qtyE4 < qtyE4) {
        throw new TradeError(
          `Insufficient shares: you hold ${position ? position.qtyE4 / 10_000 : 0} ${symbol}`,
          "insufficient_shares",
        );
      }
      realized = realizedPnlCents(qtyE4, fillPriceCents, position.avgCostCents);
      const proceeds = notionalCents(fillPriceCents, qtyE4);
      const newCash = portfolio.cashCents + proceeds;
      tx.update(tables.portfolios)
        .set({ cashCents: newCash })
        .where(eq(tables.portfolios.id, portfolioId))
        .run();
      tx.insert(tables.cashLedger)
        .values({
          portfolioId,
          deltaCents: proceeds,
          balanceAfterCents: newCash,
          reason: "trade_sell",
          refId: orderId,
        })
        .run();
      const remaining = position.qtyE4 - qtyE4;
      if (remaining === 0) {
        tx.delete(tables.positions).where(eq(tables.positions.id, position.id)).run();
      } else {
        tx.update(tables.positions)
          .set({
            qtyE4: remaining,
            realizedPnlCents: position.realizedPnlCents + realized,
            updatedAt: Date.now(),
          })
          .where(eq(tables.positions.id, position.id))
          .run();
      }
    }

    const trade = tx
      .insert(tables.trades)
      .values({
        orderId,
        portfolioId,
        symbol,
        side,
        qtyE4,
        priceCents: fillPriceCents,
        quotePriceCents,
        realizedPnlCents: realized,
        executedAt: Date.now(),
      })
      .returning({ id: tables.trades.id })
      .all()[0]!;

    tx.update(tables.orders)
      .set({ status: "filled", statusReason: note ?? null, updatedAt: Date.now() })
      .where(eq(tables.orders.id, orderId))
      .run();

    return { tradeId: trade.id, realizedPnlCents: realized };
  });
}

export type PlaceOrderResult = {
  orderId: string;
  status: "filled" | "open" | "rejected";
  tradeId?: string;
  fillPriceCents?: number;
  realizedPnlCents?: number | null;
  message: string;
};

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  validateOrder(input);
  const symbol = normalizeSymbol(input.symbol);

  // Idempotency: same key on the same portfolio returns the original order.
  if (input.idempotencyKey) {
    const existing = db
      .select()
      .from(tables.orders)
      .where(
        and(
          eq(tables.orders.portfolioId, input.portfolioId),
          eq(tables.orders.idempotencyKey, input.idempotencyKey),
        ),
      )
      .all()[0];
    if (existing) {
      return {
        orderId: existing.id,
        status:
          existing.status === "filled"
            ? "filled"
            : existing.status === "open"
              ? "open"
              : "rejected",
        message: "Duplicate submission ignored — original order returned",
      };
    }
  }

  const quote = await getQuote(symbol); // throws if the symbol has no data — never invents a price
  const market = getMarketStatus();

  const order = db
    .insert(tables.orders)
    .values({
      portfolioId: input.portfolioId,
      symbol,
      side: input.side,
      type: input.type,
      qtyE4: input.qtyE4,
      limitPriceCents: input.limitPriceCents ?? null,
      stopPriceCents: input.stopPriceCents ?? null,
      status: "open",
      idempotencyKey: input.idempotencyKey ?? null,
      updatedAt: Date.now(),
    })
    .returning()
    .all()[0]!;

  try {
    if (input.type === "market") {
      const fillPrice = applySlippage(quote.priceCents, input.side);
      const note = market.open
        ? undefined
        : `Filled outside regular hours at last available price (${quote.stale ? "stale " : ""}${quote.source})`;
      const { tradeId, realizedPnlCents: pnl } = executeFill(
        order.id,
        input.portfolioId,
        symbol,
        input.side,
        input.qtyE4,
        fillPrice,
        quote.priceCents,
        note,
      );
      return {
        orderId: order.id,
        status: "filled",
        tradeId,
        fillPriceCents: fillPrice,
        realizedPnlCents: pnl,
        message: `Filled at ${(fillPrice / 100).toFixed(2)}`,
      };
    }

    // Resting order: validate feasibility now (cash/shares) so users get
    // immediate feedback, then leave it open for the sweep.
    if (input.side === "buy") {
      const reservePrice = input.limitPriceCents ?? input.stopPriceCents ?? quote.priceCents;
      const portfolio = db
        .select()
        .from(tables.portfolios)
        .where(eq(tables.portfolios.id, input.portfolioId))
        .all()[0];
      if (!portfolio) throw new TradeError("Portfolio not found", "not_found");
      if (portfolio.cashCents < notionalCents(applySlippage(reservePrice, "buy"), input.qtyE4)) {
        throw new TradeError("Insufficient buying power for this order", "insufficient_funds");
      }
    } else {
      const position = db
        .select()
        .from(tables.positions)
        .where(
          and(
            eq(tables.positions.portfolioId, input.portfolioId),
            eq(tables.positions.symbol, symbol),
          ),
        )
        .all()[0];
      if (!position || position.qtyE4 < input.qtyE4) {
        throw new TradeError("You do not hold enough shares for this order", "insufficient_shares");
      }
    }

    // Try an immediate match (e.g. a marketable limit).
    const swept = await trySweepOrder({ ...order, status: "open" }, quote);
    if (swept) {
      return {
        orderId: order.id,
        status: "filled",
        fillPriceCents: swept.fillPriceCents,
        message: `Filled at ${(swept.fillPriceCents / 100).toFixed(2)}`,
      };
    }

    return { orderId: order.id, status: "open", message: "Order accepted and resting" };
  } catch (err) {
    db.update(tables.orders)
      .set({
        status: "rejected",
        statusReason: err instanceof Error ? err.message : "Unknown error",
        updatedAt: Date.now(),
      })
      .where(eq(tables.orders.id, order.id))
      .run();
    throw err;
  }
}

type OrderRow = typeof tables.orders.$inferSelect;

/** Trigger rules for resting orders against a fresh quote. */
function shouldTrigger(order: OrderRow, quote: Quote): { fillBaseCents: number } | null {
  const p = quote.priceCents;
  switch (order.type) {
    case "limit": {
      const limit = order.limitPriceCents!;
      if (order.side === "buy" && p <= limit) return { fillBaseCents: Math.min(p, limit) };
      if (order.side === "sell" && p >= limit) return { fillBaseCents: Math.max(p, limit) };
      return null;
    }
    case "stop": {
      const stop = order.stopPriceCents!;
      if (order.side === "buy" && p >= stop) return { fillBaseCents: p };
      if (order.side === "sell" && p <= stop) return { fillBaseCents: p };
      return null;
    }
    case "stop_limit": {
      const stop = order.stopPriceCents!;
      const limit = order.limitPriceCents!;
      const stopped = order.side === "buy" ? p >= stop : p <= stop;
      if (!stopped) return null;
      if (order.side === "buy" && p <= limit) return { fillBaseCents: p };
      if (order.side === "sell" && p >= limit) return { fillBaseCents: p };
      return null;
    }
    default:
      return null;
  }
}

async function trySweepOrder(
  order: OrderRow,
  quote: Quote,
): Promise<{ fillPriceCents: number } | null> {
  const trigger = shouldTrigger(order, quote);
  if (!trigger) return null;
  const fillPrice =
    order.type === "limit" || order.type === "stop_limit"
      ? trigger.fillBaseCents // limit fills don't get extra slippage past the limit
      : applySlippage(trigger.fillBaseCents, order.side);
  try {
    executeFill(
      order.id,
      order.portfolioId,
      order.symbol,
      order.side,
      order.qtyE4,
      fillPrice,
      quote.priceCents,
    );
    return { fillPriceCents: fillPrice };
  } catch (err) {
    if (err instanceof TradeError) {
      // Conditions changed since placement (spent cash / sold shares): reject.
      db.update(tables.orders)
        .set({ status: "rejected", statusReason: err.message, updatedAt: Date.now() })
        .where(eq(tables.orders.id, order.id))
        .run();
      return null;
    }
    throw err;
  }
}

/** Match all open orders for a portfolio against fresh quotes. */
export async function sweepOpenOrders(portfolioId: string): Promise<number> {
  const open = db
    .select()
    .from(tables.orders)
    .where(and(eq(tables.orders.portfolioId, portfolioId), eq(tables.orders.status, "open")))
    .all();
  let filled = 0;
  for (const order of open) {
    try {
      const quote = await getQuote(order.symbol);
      if (await trySweepOrder(order, quote)) filled++;
    } catch {
      // Quote unavailable: leave the order resting; never fill on invented data.
    }
  }
  return filled;
}

export function cancelOrder(portfolioId: string, orderId: string): boolean {
  const result = db
    .update(tables.orders)
    .set({ status: "cancelled", updatedAt: Date.now() })
    .where(
      and(
        eq(tables.orders.id, orderId),
        eq(tables.orders.portfolioId, portfolioId),
        eq(tables.orders.status, "open"),
      ),
    )
    .run();
  return result.changes > 0;
}

/** Add paper cash to a portfolio (recorded in the ledger). */
export function deposit(portfolioId: string, amountCents: number): number {
  if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > 100_000_000_00) {
    throw new TradeError("Invalid deposit amount", "invalid_order");
  }
  return db.transaction((tx) => {
    const portfolio = tx
      .select()
      .from(tables.portfolios)
      .where(eq(tables.portfolios.id, portfolioId))
      .all()[0];
    if (!portfolio) throw new TradeError("Portfolio not found", "not_found");
    const newCash = portfolio.cashCents + amountCents;
    tx.update(tables.portfolios)
      .set({ cashCents: newCash })
      .where(eq(tables.portfolios.id, portfolioId))
      .run();
    tx.insert(tables.cashLedger)
      .values({
        portfolioId,
        deltaCents: amountCents,
        balanceAfterCents: newCash,
        reason: "deposit",
        refId: null,
      })
      .run();
    return newCash;
  });
}
