"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChartIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/client";
import { fmtCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/format";
import { Skeleton } from "@/components/ui/skeleton";
import type { HistoryResponse } from "./types";

type Range = "1M" | "3M" | "All";
const RANGES: Range[] = ["1M", "3M", "All"];

function cutoffFor(range: Range): string | null {
  if (range === "All") return null;
  const d = new Date();
  d.setMonth(d.getMonth() - (range === "1M" ? 1 : 3));
  return d.toISOString().slice(0, 10);
}

/** Reads a CSS custom property after mount (charts need concrete colors). */
function useCssVars(names: string[]): string[] | null {
  const [vars, setVars] = React.useState<string[] | null>(null);
  const key = names.join(",");
  React.useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    setVars(key.split(",").map((n) => style.getPropertyValue(n).trim()));
  }, [key]);
  return vars;
}

export function PerformanceChart() {
  const [range, setRange] = React.useState<Range>("3M");
  const [showBenchmark, setShowBenchmark] = React.useState(true);
  const colors = useCssVars(["--chart-1", "--ink-muted"]);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["portfolio", "history"],
    queryFn: () => api<HistoryResponse>("/api/portfolio/history"),
  });

  const points = React.useMemo(() => {
    if (!data) return [];
    const cutoff = cutoffFor(range);
    const snaps = cutoff ? data.snapshots.filter((s) => s.date >= cutoff) : data.snapshots;
    const bench = new Map(data.benchmark.map((b) => [b.date, b.valueCents]));
    return snaps.map((s) => ({
      date: s.date,
      value: s.totalValueCents,
      bench: bench.get(s.date) ?? null,
    }));
  }, [data, range]);

  const hasBenchmark = (data?.benchmark.length ?? 0) > 0;

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle>Performance</CardTitle>
          <CardDescription>Daily portfolio value snapshots</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {hasBenchmark && (
            <button
              type="button"
              onClick={() => setShowBenchmark((v) => !v)}
              aria-pressed={showBenchmark}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                showBenchmark
                  ? "border-line-strong bg-panel-2 text-ink"
                  : "border-line text-ink-faint hover:text-ink-muted",
              )}
            >
              vs SPY
            </button>
          )}
          <div className="inline-flex items-center gap-0.5 rounded-md border border-line bg-panel-2 p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={cn(
                  "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                  range === r ? "bg-panel text-ink shadow-xs" : "text-ink-muted hover:text-ink",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : isError ? (
          <ErrorState
            description="Portfolio history could not be loaded."
            retry={() => refetch()}
          />
        ) : points.length < 2 ? (
          <EmptyState
            icon={<LineChartIcon />}
            title="Not enough history yet"
            description="A snapshot of your portfolio value is recorded each day you use the app. Check back tomorrow to see your performance curve take shape."
          />
        ) : (
          <div className="h-64 w-full">
            {colors && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id="pf-value" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors[0]} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={colors[0]} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeOpacity={0.08} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={40}
                    tickFormatter={(d: string) =>
                      new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    domain={["auto", "auto"]}
                    tickFormatter={(v: number) => `$${Math.round(v / 100).toLocaleString("en-US")}`}
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const value = payload.find((p) => p.dataKey === "value")?.value;
                      const bench = payload.find((p) => p.dataKey === "bench")?.value;
                      return (
                        <div className="rounded-md border border-line bg-panel px-3 py-2 text-xs shadow-md">
                          <p className="mb-1 font-medium text-ink">{String(label)}</p>
                          {typeof value === "number" && (
                            <p className="tnum text-ink">Portfolio {fmtCents(value)}</p>
                          )}
                          {showBenchmark && typeof bench === "number" && (
                            <p className="tnum text-ink-muted">SPY (scaled) {fmtCents(bench)}</p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={colors[0]}
                    strokeWidth={2}
                    fill="url(#pf-value)"
                    dot={false}
                    isAnimationActive={false}
                  />
                  {showBenchmark && hasBenchmark && (
                    <Line
                      type="monotone"
                      dataKey="bench"
                      stroke={colors[1]}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={false}
                      isAnimationActive={false}
                      connectNulls
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
        {points.length >= 2 && hasBenchmark && showBenchmark && (
          <p className="mt-2 text-[11px] text-ink-faint">
            SPY benchmark scaled to your starting portfolio value over the same period.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
