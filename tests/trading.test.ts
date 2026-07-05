import { beforeAll, describe, expect, it } from "vitest";
import { db, tables } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { getQuote } from "@/lib/market-data";
import { notionalCents, toQtyE4 } from "@/lib/money";
import { ensureDefaultPortfolio } from "@/lib/services/portfolio";
import { cancelOrder, deposit, placeOrder, TradeError } from "@/lib/services/trading";
import { eq } from "drizzle-orm";

/**
 * Engine tests run against an in-memory SQLite database with the synthetic
 * (deterministic, offline) market-data provider — no network, no flakiness.
 */

let portfolioId: string;

beforeAll(() => {
  const user = db
    .insert(tables.users)
    .values({ email: "t@t.test", username: "tester", passwordHash: hashPassword("x".repeat(8)) })
    .returning()
    .all()[0]!;
  portfolioId = ensureDefaultPortfolio(user.id).id;
});

function cash(): number {
  return db.select().from(tables.portfolios).where(eq(tables.portfolios.id, portfolioId)).all()[0]!
    .cashCents;
}

describe("paper trading engine", () => {
  it("fills a market buy atomically: cash + position + trade + ledger agree", async () => {
    const before = cash();
    const result = await placeOrder({
      portfolioId,
      symbol: "AAPL",
      side: "buy",
      type: "market",
      qtyE4: toQtyE4(10),
    });
    expect(result.status).toBe("filled");
    const fill = result.fillPriceCents!;
    const cost = notionalCents(fill, toQtyE4(10));
    expect(cash()).toBe(before - cost);

    const position = db
      .select()
      .from(tables.positions)
      .where(eq(tables.positions.portfolioId, portfolioId))
      .all()
      .find((p) => p.symbol === "AAPL")!;
    expect(position.qtyE4).toBe(toQtyE4(10));
    expect(position.avgCostCents).toBe(fill);

    const ledger = db
      .select()
      .from(tables.cashLedger)
      .where(eq(tables.cashLedger.portfolioId, portfolioId))
      .all();
    expect(ledger[ledger.length - 1]!.balanceAfterCents).toBe(cash());
  });

  it("applies slippage against the trader on market orders", async () => {
    const quote = await getQuote("MSFT");
    const result = await placeOrder({
      portfolioId,
      symbol: "MSFT",
      side: "buy",
      type: "market",
      qtyE4: toQtyE4(1),
    });
    expect(result.fillPriceCents!).toBeGreaterThanOrEqual(quote.priceCents);
  });

  it("rejects buys beyond buying power and leaves state untouched", async () => {
    const before = cash();
    await expect(
      placeOrder({
        portfolioId,
        symbol: "NVDA",
        side: "buy",
        type: "market",
        qtyE4: toQtyE4(1_000_000),
      }),
    ).rejects.toThrow(TradeError);
    expect(cash()).toBe(before);
  });

  it("rejects selling shares you don't hold", async () => {
    await expect(
      placeOrder({
        portfolioId,
        symbol: "KO",
        side: "sell",
        type: "market",
        qtyE4: toQtyE4(5),
      }),
    ).rejects.toThrow(/Insufficient shares/);
  });

  it("is idempotent: duplicate keys return the original order without re-executing", async () => {
    const before = cash();
    const first = await placeOrder({
      portfolioId,
      symbol: "JPM",
      side: "buy",
      type: "market",
      qtyE4: toQtyE4(2),
      idempotencyKey: "dup-test-1",
    });
    const afterFirst = cash();
    const second = await placeOrder({
      portfolioId,
      symbol: "JPM",
      side: "buy",
      type: "market",
      qtyE4: toQtyE4(2),
      idempotencyKey: "dup-test-1",
    });
    expect(second.orderId).toBe(first.orderId);
    expect(cash()).toBe(afterFirst);
    expect(afterFirst).toBeLessThan(before);
  });

  it("realizes P/L on sells using average cost", async () => {
    // Sell half the AAPL position bought earlier.
    const position = db
      .select()
      .from(tables.positions)
      .where(eq(tables.positions.portfolioId, portfolioId))
      .all()
      .find((p) => p.symbol === "AAPL")!;
    const result = await placeOrder({
      portfolioId,
      symbol: "AAPL",
      side: "sell",
      type: "market",
      qtyE4: toQtyE4(5),
    });
    expect(result.status).toBe("filled");
    const expected =
      notionalCents(result.fillPriceCents!, toQtyE4(5)) -
      notionalCents(position.avgCostCents, toQtyE4(5));
    expect(result.realizedPnlCents).toBe(expected);

    const remaining = db
      .select()
      .from(tables.positions)
      .where(eq(tables.positions.portfolioId, portfolioId))
      .all()
      .find((p) => p.symbol === "AAPL")!;
    expect(remaining.qtyE4).toBe(position.qtyE4 - toQtyE4(5));
    expect(remaining.avgCostCents).toBe(position.avgCostCents); // basis unchanged on sells
  });

  it("fills marketable limit orders immediately, rests non-marketable ones", async () => {
    const quote = await getQuote("XOM");
    const marketable = await placeOrder({
      portfolioId,
      symbol: "XOM",
      side: "buy",
      type: "limit",
      qtyE4: toQtyE4(1),
      limitPriceCents: Math.round(quote.priceCents * 1.05),
    });
    expect(marketable.status).toBe("filled");
    // Limit orders never fill above the limit.
    expect(marketable.fillPriceCents!).toBeLessThanOrEqual(Math.round(quote.priceCents * 1.05));

    const resting = await placeOrder({
      portfolioId,
      symbol: "XOM",
      side: "buy",
      type: "limit",
      qtyE4: toQtyE4(1),
      limitPriceCents: Math.round(quote.priceCents * 0.5),
    });
    expect(resting.status).toBe("open");

    expect(cancelOrder(portfolioId, resting.orderId)).toBe(true);
    expect(cancelOrder(portfolioId, resting.orderId)).toBe(false); // already cancelled
  });

  it("validates order shapes", async () => {
    await expect(
      placeOrder({ portfolioId, symbol: "AAPL", side: "buy", type: "limit", qtyE4: toQtyE4(1) }),
    ).rejects.toThrow(/limit price/i);
    await expect(
      placeOrder({ portfolioId, symbol: "AAPL", side: "buy", type: "market", qtyE4: 0 }),
    ).rejects.toThrow(/positive/i);
    await expect(
      placeOrder({ portfolioId, symbol: "not a symbol!!", side: "buy", type: "market", qtyE4: 1 }),
    ).rejects.toThrow();
  });

  it("records deposits in the ledger", () => {
    const before = cash();
    const after = deposit(portfolioId, 50_000_00);
    expect(after).toBe(before + 50_000_00);
    expect(() => deposit(portfolioId, -5)).toThrow(TradeError);
    expect(() => deposit(portfolioId, 0.5)).toThrow(TradeError);
  });
});
