import { withUser } from "@/lib/api";
import { getProfile, getQuote, normalizeSymbol } from "@/lib/market-data";

/**
 * Single-symbol quote for client surfaces (trade ticket context).
 * GET /api/quote?symbol=NVDA → { quote, name }
 * ProviderError maps to 404/429/502 via withUser; no invented prices.
 */
export const GET = withUser(async (req) => {
  const raw = new URL(req.url).searchParams.get("symbol") ?? "";
  const symbol = normalizeSymbol(raw);
  const quote = await getQuote(symbol);
  const profile = await getProfile(symbol).catch(() => null);
  return { quote, name: profile?.name ?? null };
});
