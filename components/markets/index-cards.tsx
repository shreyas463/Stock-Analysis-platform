"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Money, MoneyDelta, PctDelta, SourceBadge } from "@/components/format";
import { useUniverseQuotes } from "@/components/markets/use-universe";
import type { CandlesPayload, UniverseQuoteLite } from "@/components/markets/types";

const INDEXES: { symbol: string; label: string }[] = [
  { symbol: "SPY", label: "S&P 500 · SPDR S&P 500 ETF Trust" },
  { symbol: "QQQ", label: "Nasdaq-100 · Invesco QQQ Trust" },
];

function ninetyDaysAgoStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().slice(0, 10);
}

/** 90-day close-price area sparkline; renders nothing when data is missing. */
function AreaSparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const w = 200;
  const h = 48;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - 3 - ((v - min) / span) * (h - 8);
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} ${w},${h} 0,${h}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("pointer-events-none block h-12 w-full", className)}
    >
      <polygon points={area} fill="currentColor" opacity="0.12" />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function IndexCard({
  symbol,
  label,
  quote,
  quotesPending,
}: {
  symbol: string;
  label: string;
  quote: UniverseQuoteLite | null;
  quotesPending: boolean;
}) {
  // Candles route is optional: if it isn't available (404 etc.), render the
  // card without a sparkline — never an error.
  const candles = useQuery({
    queryKey: ["index-candles-90d", symbol],
    queryFn: () => api<CandlesPayload>(`/api/stocks/${symbol}/candles?from=${ninetyDaysAgoStr()}`),
    retry: false,
    staleTime: 5 * 60_000,
  });

  const closes = Array.isArray(candles.data?.candles)
    ? candles.data.candles
        .map((c) => c?.closeCents)
        .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
    : [];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 pb-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{symbol}</p>
            <p className="mt-0.5 truncate text-xs text-ink-muted">{label}</p>
          </div>
          {quote && (
            <SourceBadge synthetic={quote.synthetic} stale={quote.stale} asOf={quote.asOf} />
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-3">
          {quotesPending ? (
            <>
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-4 w-28" />
            </>
          ) : quote ? (
            <>
              <Money cents={quote.priceCents} className="text-2xl font-semibold tracking-tight" />
              <span className="flex items-center gap-2 text-sm">
                <MoneyDelta cents={quote.changeCents} />
                <PctDelta value={quote.changePct} />
              </span>
            </>
          ) : (
            <span className="text-sm text-ink-muted">Quote unavailable</span>
          )}
        </div>
        <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-faint">Past 90 days</p>
      </CardContent>
      <div className="mt-2 h-12">
        {candles.isPending ? (
          <Skeleton className="mx-4 h-10 rounded-md" />
        ) : (
          <AreaSparkline values={closes} className="text-chart-1" />
        )}
      </div>
    </Card>
  );
}

export function IndexCards() {
  const universe = useUniverseQuotes();
  const bySymbol = new Map(universe.data?.rows.map((r) => [r.symbol, r.quote]) ?? []);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {INDEXES.map((ix) => (
        <IndexCard
          key={ix.symbol}
          symbol={ix.symbol}
          label={ix.label}
          quote={bySymbol.get(ix.symbol) ?? null}
          quotesPending={universe.isPending}
        />
      ))}
    </div>
  );
}
