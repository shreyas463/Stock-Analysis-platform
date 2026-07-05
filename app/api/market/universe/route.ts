import { withUser } from "@/lib/api";
import { getQuotes, isDemoMode, UNIVERSE } from "@/lib/market-data";
import type { UniversePayload, UniverseRow } from "@/components/markets/types";

export const GET = withUser(async (): Promise<UniversePayload> => {
  const quotes = await getQuotes(UNIVERSE.map((u) => u.symbol));

  const rows: UniverseRow[] = UNIVERSE.map((u) => {
    const q = quotes.get(u.symbol);
    return {
      symbol: u.symbol,
      name: u.name,
      sector: u.sector,
      industry: u.industry,
      exchange: u.exchange,
      etf: Boolean(u.etf),
      quote: q
        ? {
            priceCents: q.priceCents,
            changeCents: q.changeCents,
            changePct: q.changePct,
            synthetic: q.synthetic,
            stale: q.stale,
            asOf: q.asOf,
          }
        : null,
    };
  });

  return { rows, demoMode: isDemoMode(), asOf: Date.now() };
});
