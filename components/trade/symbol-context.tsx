"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CompassIcon } from "lucide-react";
import type { PortfolioOverview } from "@/lib/services/portfolio";
import { api } from "@/lib/client";
import { fmtCents, fmtQtyE4 } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, MoneyDelta, PctDelta, SourceBadge } from "@/components/format";
import type { QuoteResponse } from "@/components/portfolio/types";

type SparkPoint = { date: string; closeCents: number };

/**
 * The candles endpoint belongs to the research vertical — parse defensively
 * and hide the sparkline entirely if it's missing or shaped differently.
 */
function parseCandles(data: unknown): SparkPoint[] | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const arr = Array.isArray(obj.candles)
    ? obj.candles
    : Array.isArray((obj.series as Record<string, unknown> | undefined)?.candles)
      ? ((obj.series as Record<string, unknown>).candles as unknown[])
      : Array.isArray(data)
        ? (data as unknown[])
        : null;
  if (!arr) return null;
  const points: SparkPoint[] = [];
  for (const c of arr) {
    if (!c || typeof c !== "object") return null;
    const row = c as Record<string, unknown>;
    const date = typeof row.date === "string" ? row.date : null;
    const close =
      typeof row.closeCents === "number"
        ? row.closeCents
        : typeof row.close === "number"
          ? Math.round(row.close * 100)
          : null;
    if (!date || close === null) return null;
    points.push({ date, closeCents: close });
  }
  return points.length >= 2 ? points : null;
}

function Sparkline({ points }: { points: SparkPoint[] }) {
  const w = 320;
  const h = 64;
  const values = points.map((p) => p.closeCents);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - ((p.closeCents - min) / span) * (h - 6) - 3).toFixed(1)}`,
    )
    .join(" ");
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  const rising = last >= first;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-16 w-full"
      role="img"
      aria-label="3-month price sparkline"
      preserveAspectRatio="none"
    >
      <path
        d={d}
        fill="none"
        stroke={rising ? "var(--pos)" : "var(--neg)"}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function SymbolContext({ symbol }: { symbol: string | null }) {
  const quoteQuery = useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => api<QuoteResponse>(`/api/quote?symbol=${encodeURIComponent(symbol!)}`),
    enabled: !!symbol,
    refetchInterval: 30_000,
  });
  const portfolioQuery = useQuery({
    queryKey: ["portfolio"],
    queryFn: () => api<PortfolioOverview>("/api/portfolio"),
  });

  // 3-month sparkline via the research vertical's candles endpoint (optional).
  const from = React.useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  }, []);
  const candlesQuery = useQuery({
    queryKey: ["candles-spark", symbol],
    queryFn: async () => {
      try {
        const raw = await api<unknown>(`/api/stocks/${encodeURIComponent(symbol!)}/candles`);
        return parseCandles(raw);
      } catch {
        return null; // endpoint missing or failing → hide the sparkline
      }
    },
    enabled: !!symbol,
    staleTime: 10 * 60_000,
  });
  const spark = React.useMemo(() => {
    if (!candlesQuery.data) return null;
    const filtered = candlesQuery.data.filter((p) => p.date >= from);
    return filtered.length >= 2 ? filtered : null;
  }, [candlesQuery.data, from]);

  if (!symbol) {
    return (
      <Card>
        <CardContent className="p-4">
          <EmptyState
            icon={<CompassIcon />}
            title="No symbol selected"
            description="Search for a symbol in the ticket to see its quote, your position, and buying power here."
          />
        </CardContent>
      </Card>
    );
  }

  const quote = quoteQuery.data?.quote ?? null;
  const name = quoteQuery.data?.name ?? null;
  const position = portfolioQuery.data?.positions.find((p) => p.symbol === symbol) ?? null;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="font-mono">{symbol}</CardTitle>
          {name && <p className="mt-0.5 max-w-56 truncate text-xs text-ink-muted">{name}</p>}
        </div>
        <Link
          href={`/research/${symbol}`}
          className="text-xs font-medium text-brand transition-colors hover:text-brand-strong"
        >
          Full research →
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {quoteQuery.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        ) : quoteQuery.isError || !quote ? (
          <p className="rounded-md bg-warn-soft px-3 py-2 text-xs text-warn">
            No quote available for {symbol}.
          </p>
        ) : (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight tnum">
                {fmtCents(quote.priceCents, { precise: true })}
              </span>
              <SourceBadge
                synthetic={quote.synthetic}
                stale={quote.stale}
                source={quote.source}
                asOf={quote.asOf}
              />
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs">
              <MoneyDelta cents={quote.changeCents} precise />
              <PctDelta value={quote.changePct} />
              <span className="text-ink-faint">today</span>
            </p>
          </div>
        )}

        {spark && (
          <div>
            <Sparkline points={spark} />
            <p className="mt-0.5 text-[11px] text-ink-faint">Last 3 months, daily closes</p>
          </div>
        )}

        <Separator />

        <div className="space-y-2 text-sm">
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">Your position</p>
          {position ? (
            <div className="space-y-1.5">
              <Row label="Quantity">
                <span className="tnum">{fmtQtyE4(position.qtyE4)} shares</span>
              </Row>
              <Row label="Avg cost">
                <span className="tnum">{fmtCents(position.avgCostCents, { precise: true })}</span>
              </Row>
              <Row label="Market value">
                <span className="tnum">
                  {position.marketValueCents === null ? "—" : fmtCents(position.marketValueCents)}
                </span>
              </Row>
              <Row label="Unrealized P/L">
                {position.unrealizedPnlCents === null ? (
                  <span className="text-ink-faint">—</span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <MoneyDelta cents={position.unrealizedPnlCents} className="text-xs" />
                    {position.unrealizedPnlPct !== null && (
                      <PctDelta value={position.unrealizedPnlPct} className="text-[11px]" />
                    )}
                  </span>
                )}
              </Row>
            </div>
          ) : (
            <p className="text-xs text-ink-muted">You don&apos;t hold {symbol} yet.</p>
          )}
        </div>

        <Separator />

        <Row label="Buying power">
          {portfolioQuery.data ? (
            <span className="tnum font-medium">
              {fmtCents(portfolioQuery.data.buyingPowerCents)}
            </span>
          ) : (
            <Skeleton className="h-4 w-20" />
          )}
        </Row>
      </CardContent>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-ink-muted">{label}</span>
      {children}
    </div>
  );
}
