import { withUser } from "@/lib/api";
import { getDailyCandles } from "@/lib/market-data";
import { ensureDefaultPortfolio, getSnapshots } from "@/lib/services/portfolio";

export type SnapshotPoint = { date: string; totalValueCents: number; cashCents: number };
export type BenchmarkPoint = { date: string; valueCents: number };

/**
 * Portfolio value history + an SPY benchmark normalized to the portfolio's
 * first snapshot value over the same date range. If SPY data is unavailable
 * the benchmark is simply empty — never fabricated.
 */
export const GET = withUser(async (_req, { user }) => {
  const portfolio = ensureDefaultPortfolio(user.id);
  const rows = getSnapshots(portfolio.id);

  const snapshots: SnapshotPoint[] = rows.map((r) => ({
    date: r.date,
    totalValueCents: r.totalValueCents,
    cashCents: r.cashCents,
  }));

  let benchmark: BenchmarkPoint[] = [];
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  if (first && last && first.totalValueCents > 0) {
    try {
      const spy = await getDailyCandles("SPY", { from: first.date, to: last.date });
      const firstClose = spy.candles.find((c) => c.date >= first.date)?.closeCents;
      if (firstClose && firstClose > 0) {
        const factor = first.totalValueCents / firstClose;
        benchmark = spy.candles
          .filter((c) => c.date >= first.date && c.date <= last.date)
          .map((c) => ({ date: c.date, valueCents: Math.round(c.closeCents * factor) }));
      }
    } catch {
      // SPY data unavailable — omit the benchmark rather than invent one.
    }
  }

  return { snapshots, benchmark };
});
