/**
 * Seeds a demo account with a realistic-looking (but clearly paper) history:
 * positions, resting orders, watchlists and alerts. Idempotent: re-running is a no-op.
 *
 *   email:    demo@basis.app
 *   password: demo1234
 */
import { eq } from "drizzle-orm";
import { db, tables } from "../lib/db";
import { hashPassword } from "../lib/auth/password";
import { ensureDefaultPortfolio } from "../lib/services/portfolio";
import { placeOrder } from "../lib/services/trading";
import { toQtyE4 } from "../lib/money";
import { getQuote } from "../lib/market-data";

async function main() {
  const existing = db
    .select()
    .from(tables.users)
    .where(eq(tables.users.email, "demo@basis.app"))
    .all()[0];
  if (existing) {
    console.log("✓ Demo account already seeded (demo@basis.app / demo1234)");
    return;
  }

  const user = db
    .insert(tables.users)
    .values({
      email: "demo@basis.app",
      username: "demo",
      passwordHash: hashPassword("demo1234"),
    })
    .returning()
    .all()[0]!;

  const portfolio = ensureDefaultPortfolio(user.id);

  // Build a small portfolio through the real order path.
  const buys: Array<[string, number]> = [
    ["AAPL", 40],
    ["MSFT", 20],
    ["NVDA", 25],
    ["JPM", 30],
    ["XOM", 45],
    ["UNH", 6],
  ];
  for (const [symbol, shares] of buys) {
    await placeOrder({
      portfolioId: portfolio.id,
      symbol,
      side: "buy",
      type: "market",
      qtyE4: toQtyE4(shares),
      idempotencyKey: `seed-${symbol}`,
    });
  }

  // A resting limit order to demonstrate the open-orders flow.
  const aapl = await getQuote("AAPL");
  await placeOrder({
    portfolioId: portfolio.id,
    symbol: "AAPL",
    side: "buy",
    type: "limit",
    qtyE4: toQtyE4(10),
    limitPriceCents: Math.round(aapl.priceCents * 0.9),
    idempotencyKey: "seed-limit-aapl",
  });

  // Watchlists
  const core = db
    .insert(tables.watchlists)
    .values({ userId: user.id, name: "Core Ideas", sortOrder: 0 })
    .returning()
    .all()[0]!;
  const speculative = db
    .insert(tables.watchlists)
    .values({ userId: user.id, name: "Speculative", sortOrder: 1 })
    .returning()
    .all()[0]!;
  db.insert(tables.watchlistItems)
    .values([
      {
        watchlistId: core.id,
        symbol: "GOOGL",
        note: "Search + cloud margin story",
        sortOrder: 0,
        tags: ["mega-cap"],
      },
      {
        watchlistId: core.id,
        symbol: "V",
        note: "Payments toll road",
        sortOrder: 1,
        tags: ["quality"],
      },
      {
        watchlistId: core.id,
        symbol: "COST",
        note: "Membership compounder",
        sortOrder: 2,
        tags: ["quality"],
      },
      {
        watchlistId: speculative.id,
        symbol: "AMD",
        note: "AI accelerator #2",
        sortOrder: 0,
        tags: ["semis", "high-beta"],
      },
      {
        watchlistId: speculative.id,
        symbol: "TSLA",
        note: "Volatile — wait for entry",
        sortOrder: 1,
        tags: ["high-beta"],
      },
    ])
    .run();

  // Alerts
  db.insert(tables.alerts)
    .values([
      {
        userId: user.id,
        symbol: "AAPL",
        kind: "price_below",
        threshold: Math.round(aapl.priceCents * 0.92),
      },
      { userId: user.id, symbol: "NVDA", kind: "pct_move", threshold: 500 }, // 5% in bps
      { userId: user.id, symbol: "AMD", kind: "rsi_below", threshold: 30 },
    ])
    .run();

  // Welcome notification
  db.insert(tables.notifications)
    .values({
      userId: user.id,
      kind: "system",
      title: "Welcome to Basis",
      body: "This is a paper-trading workbench. All balances are simulated.",
      href: "/",
    })
    .run();

  console.log("✓ Seeded demo account: demo@basis.app / demo1234");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
