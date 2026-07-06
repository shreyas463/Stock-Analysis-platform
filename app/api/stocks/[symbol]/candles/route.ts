import { apiError } from "@/lib/api";
import { getDailyCandles } from "@/lib/market-data";
import { symbolRoute } from "../../handler";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/stocks/[symbol]/candles?from=&to= — daily OHLCV series.
 * from/to are optional YYYY-MM-DD bounds (inclusive).
 */
export const GET = symbolRoute(async (req, symbol) => {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  if (from !== undefined && !DATE_RE.test(from)) {
    return apiError(400, "invalid_request", "from must be a YYYY-MM-DD date");
  }
  if (to !== undefined && !DATE_RE.test(to)) {
    return apiError(400, "invalid_request", "to must be a YYYY-MM-DD date");
  }
  const series = await getDailyCandles(symbol, { from, to });
  return {
    symbol: series.symbol,
    candles: series.candles,
    source: series.source,
    synthetic: series.synthetic,
    asOf: series.asOf,
  };
});
