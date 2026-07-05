import { getNews, isDemoMode } from "@/lib/market-data";
import { symbolRoute } from "../../handler";

/**
 * GET /api/stocks/[symbol]/news — recent company headlines.
 * Demo mode returns {demo: true, items: []} — headlines are never fabricated.
 */
export const GET = symbolRoute(async (_req, symbol) => {
  if (isDemoMode()) return { demo: true, items: [] };
  const items = await getNews(symbol, 15);
  return { demo: false, items };
});
