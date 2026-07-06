import { UNIVERSE } from "@/lib/market-data";
import { PageHeader } from "@/components/page-header";
import { IndexCards } from "@/components/markets/index-cards";
import { MarketStatusLine } from "@/components/markets/market-status";
import { MoversSection } from "@/components/markets/movers-section";
import { UniverseTable } from "@/components/markets/universe-table";
import type { UniverseStatic } from "@/components/markets/types";

export const metadata = { title: "Markets · Basis" };

export default function MarketsPage() {
  // Static universe facts are serialized server-side; live quotes are fetched
  // client-side so the page streams instantly.
  const universe: UniverseStatic[] = UNIVERSE.map((u) => ({
    symbol: u.symbol,
    name: u.name,
    sector: u.sector,
    industry: u.industry,
    exchange: u.exchange,
    etf: Boolean(u.etf),
  }));

  return (
    <div>
      <PageHeader
        title="Markets"
        description="Index benchmarks, biggest movers and the full coverage universe"
        actions={<MarketStatusLine />}
      />
      <div className="space-y-4">
        <IndexCards />
        <MoversSection />
        <UniverseTable universe={universe} />
      </div>
    </div>
  );
}
