import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { RecentlyViewed } from "@/components/research/recently-viewed";
import { SymbolSearch } from "@/components/research/symbol-search";
import { UNIVERSE, type UniverseEntry } from "@/lib/market-data/universe";

export const metadata = { title: "Research — Basis" };

function groupBySector(): [string, UniverseEntry[]][] {
  const bySector = new Map<string, UniverseEntry[]>();
  for (const entry of UNIVERSE) {
    const list = bySector.get(entry.sector);
    if (list) list.push(entry);
    else bySector.set(entry.sector, [entry]);
  }
  // Alphabetical, with the ETF/index bucket pinned last.
  return [...bySector.entries()].sort(([a], [b]) => {
    if (a === "Index") return 1;
    if (b === "Index") return -1;
    return a.localeCompare(b);
  });
}

export default function ResearchPage() {
  const sectors = groupBySector();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Research"
        description="Quotes, fundamentals, forecasts, and news for any listed symbol."
      />

      <section aria-label="Symbol search" className="py-4 md:py-8">
        <div className="mx-auto max-w-xl space-y-3 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Look up a stock</h2>
          <p className="text-sm text-ink-muted">
            Search by ticker or company name, then dig into the chart, fundamentals, and the
            model-validated forecast.
          </p>
        </div>
        <div className="mt-5">
          <SymbolSearch />
        </div>
      </section>

      <RecentlyViewed />

      <section aria-label="Browse by sector" className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Browse by sector</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            The coverage universe — every symbol here has full chart and forecast support.
          </p>
        </div>
        {sectors.map(([sector, entries]) => (
          <div key={sector} className="space-y-2.5">
            <div className="flex items-baseline gap-2">
              <h3 className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                {sector === "Index" ? "Index funds & ETFs" : sector}
              </h3>
              <span className="tnum text-[11px] text-ink-faint">{entries.length}</span>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {entries.map((e) => (
                <Link
                  key={e.symbol}
                  href={`/research/${e.symbol}`}
                  className="group rounded-md border border-line bg-panel p-3 transition-colors hover:border-line-strong hover:bg-panel-2/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-brand">{e.symbol}</span>
                    <span className="text-[11px] uppercase tracking-wide text-ink-faint">
                      {e.exchange}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-ink group-hover:text-ink">{e.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-ink-faint">{e.industry}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
