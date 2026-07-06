import { withUser } from "@/lib/api";
import { getNews, isDemoMode, normalizeSymbol } from "@/lib/market-data";

export const GET = withUser(async (req) => {
  // Honesty contract: demo mode never fabricates headlines.
  if (isDemoMode()) return { demo: true as const, items: [] };

  const url = new URL(req.url);
  const raw = url.searchParams.get("symbol");
  const symbol = raw && raw.trim() ? normalizeSymbol(raw) : null;
  const items = await getNews(symbol, 30);
  return { demo: false as const, items };
});
