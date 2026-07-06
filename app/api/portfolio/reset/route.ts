import { eq } from "drizzle-orm";
import { withUser } from "@/lib/api";
import { db, tables } from "@/lib/db";
import { DEFAULT_STARTING_CASH_CENTS, ensureDefaultPortfolio } from "@/lib/services/portfolio";

/** Wipe the paper portfolio back to a fresh $100k. Destructive but paper-only. */
export const POST = withUser(async (_req, { user }) => {
  const portfolio = ensureDefaultPortfolio(user.id);
  db.transaction((tx) => {
    tx.delete(tables.trades).where(eq(tables.trades.portfolioId, portfolio.id)).run();
    tx.delete(tables.orders).where(eq(tables.orders.portfolioId, portfolio.id)).run();
    tx.delete(tables.positions).where(eq(tables.positions.portfolioId, portfolio.id)).run();
    tx.delete(tables.cashLedger).where(eq(tables.cashLedger.portfolioId, portfolio.id)).run();
    tx.delete(tables.portfolioSnapshots)
      .where(eq(tables.portfolioSnapshots.portfolioId, portfolio.id))
      .run();
    tx.update(tables.portfolios)
      .set({ cashCents: DEFAULT_STARTING_CASH_CENTS })
      .where(eq(tables.portfolios.id, portfolio.id))
      .run();
    tx.insert(tables.cashLedger)
      .values({
        portfolioId: portfolio.id,
        deltaCents: DEFAULT_STARTING_CASH_CENTS,
        balanceAfterCents: DEFAULT_STARTING_CASH_CENTS,
        reason: "deposit",
        refId: "reset",
      })
      .run();
  });
  return { ok: true, cashCents: DEFAULT_STARTING_CASH_CENTS };
});
