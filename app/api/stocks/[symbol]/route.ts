import { symbolRoute } from "../handler";
import { getFundamentals, getProfile, getQuote } from "@/lib/market-data";

/**
 * GET /api/stocks/[symbol] — {quote, profile, fundamentals} bundle.
 * Profile/fundamentals are tolerant (null on provider failure, handled
 * inside lib/market-data); quote failures propagate as provider errors —
 * we never invent a price.
 */
export const GET = symbolRoute(async (_req, symbol) => {
  const [quote, profile, fundamentals] = await Promise.all([
    getQuote(symbol),
    getProfile(symbol),
    getFundamentals(symbol),
  ]);
  return { quote, profile, fundamentals };
});
