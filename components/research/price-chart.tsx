"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import {
  AreaSeries,
  CandlestickSeries,
  createChart,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type MouseEventParams,
} from "lightweight-charts";
import { CandlestickChart, ChartLine, Loader2 } from "lucide-react";
import { ErrorState, EmptyState, SourceBadge } from "@/components/format";
import { Skeleton } from "@/components/ui/skeleton";
import { bollinger, rsi, sma } from "@/lib/analytics/indicators";
import { api } from "@/lib/client";
import { fmtCents, fmtPct } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { Candle, DataSource } from "@/lib/market-data/types";
import { fmtVolume } from "./fmt";

type CandleBundle = {
  symbol: string;
  candles: Candle[];
  source: DataSource;
  synthetic: boolean;
  asOf: number;
};

const RANGES = [
  { key: "1M", months: 1 },
  { key: "3M", months: 3 },
  { key: "6M", months: 6 },
  { key: "1Y", months: 12 },
  { key: "3Y", months: 36 },
  { key: "All", months: null },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

const SMA_DEFS = [
  { key: "sma20", label: "SMA 20", period: 20, colorVar: "--chart-3" },
  { key: "sma50", label: "SMA 50", period: 50, colorVar: "--chart-4" },
  { key: "sma200", label: "SMA 200", period: 200, colorVar: "--chart-5" },
] as const;
type IndicatorKey = (typeof SMA_DEFS)[number]["key"] | "bb";

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function readColors() {
  return {
    text: cssVar("--ink-muted", "#98a2b5"),
    grid: cssVar("--line", "#232937"),
    border: cssVar("--line-strong", "#333b4e"),
    brand: cssVar("--brand", "#7c93ee"),
    pos: cssVar("--pos", "#3ecf8e"),
    neg: cssVar("--neg", "#f4657a"),
    chart1: cssVar("--chart-1", "#7c93ee"),
    chart3: cssVar("--chart-3", "#e2b93b"),
    chart4: cssVar("--chart-4", "#b18cf0"),
    chart5: cssVar("--chart-5", "#43c3d0"),
    chart6: cssVar("--chart-6", "#ef8fc2"),
    chart7: cssVar("--chart-7", "#8e9ab3"),
  };
}

function Chip({
  active,
  disabled,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "border-brand/50 bg-brand-soft text-brand"
          : "border-line bg-panel text-ink-muted hover:border-line-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function PriceChart({ symbol }: { symbol: string }) {
  const { resolvedTheme } = useTheme();
  const [chartType, setChartType] = React.useState<"candles" | "line">("candles");
  const [range, setRange] = React.useState<RangeKey>("6M");
  const [indicators, setIndicators] = React.useState<Set<IndicatorKey>>(new Set());
  const [showRsi, setShowRsi] = React.useState(false);
  const [compare, setCompare] = React.useState(false);
  const [hoveredDate, setHoveredDate] = React.useState<string | null>(null);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const rsiRef = React.useRef<HTMLDivElement | null>(null);

  const candlesQuery = useQuery({
    queryKey: ["candles", symbol],
    queryFn: () => api<CandleBundle>(`/api/stocks/${encodeURIComponent(symbol)}/candles`),
    staleTime: 5 * 60_000,
  });

  const spyQuery = useQuery({
    queryKey: ["candles", "SPY"],
    queryFn: () => api<CandleBundle>(`/api/stocks/SPY/candles`),
    staleTime: 5 * 60_000,
    enabled: compare && symbol !== "SPY",
  });

  const all = React.useMemo(() => candlesQuery.data?.candles ?? [], [candlesQuery.data]);

  const { filtered, startIdx } = React.useMemo(() => {
    if (all.length === 0) return { filtered: [] as Candle[], startIdx: 0 };
    const months = RANGES.find((r) => r.key === range)?.months ?? null;
    if (months == null) return { filtered: all, startIdx: 0 };
    const last = all[all.length - 1]!;
    const d = new Date(`${last.date}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - months);
    const from = d.toISOString().slice(0, 10);
    let idx = all.findIndex((c) => c.date >= from);
    if (idx < 0) idx = 0;
    return { filtered: all.slice(idx), startIdx: idx };
  }, [all, range]);

  const closesAll = React.useMemo(() => all.map((c) => c.closeCents), [all]);

  // Normalized (=100 at range start) pairs for "vs SPY" — only dates both have.
  const compareData = React.useMemo(() => {
    if (!compare || symbol === "SPY") return null;
    const spy = spyQuery.data?.candles;
    if (!spy || filtered.length === 0) return null;
    const spyByDate = new Map(spy.map((c) => [c.date, c.closeCents]));
    const points: { time: string; a: number; b: number }[] = [];
    let baseA: number | null = null;
    let baseB: number | null = null;
    for (const c of filtered) {
      const s = spyByDate.get(c.date);
      if (s == null || s <= 0 || c.closeCents <= 0) continue;
      if (baseA == null || baseB == null) {
        baseA = c.closeCents;
        baseB = s;
      }
      points.push({ time: c.date, a: (c.closeCents / baseA) * 100, b: (s / baseB) * 100 });
    }
    return points.length > 1 ? points : null;
  }, [compare, symbol, spyQuery.data, filtered]);

  const indicatorKey = React.useMemo(() => [...indicators].sort().join(","), [indicators]);
  const compareActive = compareData != null;

  // ── main chart ────────────────────────────────────────────────────
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || filtered.length === 0) return;
    const colors = readColors();

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: colors.text,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: colors.grid },
        horzLines: { color: colors.grid },
      },
      rightPriceScale: { borderColor: colors.grid },
      timeScale: { borderColor: colors.grid },
      crosshair: {
        vertLine: { labelBackgroundColor: colors.brand },
        horzLine: { labelBackgroundColor: colors.brand },
      },
    });

    if (compareActive && compareData) {
      const mkOpts = (color: string, title: string) => ({
        color,
        lineWidth: 2 as const,
        title,
        priceLineVisible: false,
        priceFormat: {
          type: "custom" as const,
          formatter: (v: number) => v.toFixed(0),
          minMove: 0.01,
        },
      });
      const symSeries = chart.addSeries(LineSeries, mkOpts(colors.chart1, symbol));
      const spySeries = chart.addSeries(LineSeries, mkOpts(colors.chart7, "SPY"));
      symSeries.setData(compareData.map((p) => ({ time: p.time, value: p.a })));
      spySeries.setData(compareData.map((p) => ({ time: p.time, value: p.b })));
    } else {
      const priceFormat = { type: "price" as const, precision: 2, minMove: 0.01 };
      if (chartType === "candles") {
        const series = chart.addSeries(CandlestickSeries, {
          upColor: colors.pos,
          downColor: colors.neg,
          borderUpColor: colors.pos,
          borderDownColor: colors.neg,
          wickUpColor: colors.pos,
          wickDownColor: colors.neg,
          priceFormat,
        });
        series.setData(
          filtered.map((c) => ({
            time: c.date,
            open: c.openCents / 100,
            high: c.highCents / 100,
            low: c.lowCents / 100,
            close: c.closeCents / 100,
          })),
        );
      } else {
        const series = chart.addSeries(AreaSeries, {
          lineColor: colors.chart1,
          lineWidth: 2,
          topColor: `${colors.chart1}33`,
          bottomColor: `${colors.chart1}05`,
          priceFormat,
        });
        series.setData(filtered.map((c) => ({ time: c.date, value: c.closeCents / 100 })));
      }

      // Volume pane: separate overlay price scale pinned to the bottom.
      const volume = chart.addSeries(HistogramSeries, {
        priceScaleId: "volume",
        priceFormat: { type: "volume" },
        priceLineVisible: false,
        lastValueVisible: false,
      });
      chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      chart.priceScale("right").applyOptions({ scaleMargins: { top: 0.06, bottom: 0.22 } });
      volume.setData(
        filtered.map((c) => ({
          time: c.date,
          value: c.volume,
          color: c.closeCents >= c.openCents ? `${colors.pos}59` : `${colors.neg}59`,
        })),
      );

      // Indicator overlays are computed on the FULL history, then sliced, so
      // e.g. SMA 200 has values at the start of short ranges.
      const overlay = (values: (number | null)[], color: string, title: string, dashed = false) => {
        const series = chart.addSeries(LineSeries, {
          color,
          lineWidth: 1,
          title,
          priceLineVisible: false,
          lastValueVisible: false,
          lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
          crosshairMarkerVisible: false,
          priceFormat,
        });
        const points: { time: string; value: number }[] = [];
        for (let i = 0; i < filtered.length; i++) {
          const v = values[startIdx + i];
          const c = filtered[i];
          if (v != null && c) points.push({ time: c.date, value: v / 100 });
        }
        series.setData(points);
      };

      for (const def of SMA_DEFS) {
        if (indicators.has(def.key)) {
          overlay(sma(closesAll, def.period), cssVar(def.colorVar, "#888"), def.label);
        }
      }
      if (indicators.has("bb")) {
        const bands = bollinger(closesAll, 20, 2);
        overlay(bands.upper, colors.chart6, "BB upper", true);
        overlay(bands.lower, colors.chart6, "BB lower", true);
      }
    }

    chart.timeScale().fitContent();

    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      setHoveredDate(typeof param.time === "string" ? param.time : null);
    });

    return () => {
      chart.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filtered,
    startIdx,
    closesAll,
    chartType,
    indicatorKey,
    compareActive,
    compareData,
    resolvedTheme,
    symbol,
  ]);

  // ── RSI sub-panel ─────────────────────────────────────────────────
  React.useEffect(() => {
    const el = rsiRef.current;
    if (!el || !showRsi || filtered.length === 0) return;
    const colors = readColors();

    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { color: "transparent" }, textColor: colors.text, fontSize: 10 },
      grid: { vertLines: { visible: false }, horzLines: { color: colors.grid } },
      rightPriceScale: { borderColor: colors.grid },
      timeScale: { borderColor: colors.grid },
    });

    const series = chart.addSeries(LineSeries, {
      color: colors.chart4,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: true,
      priceFormat: { type: "custom", formatter: (v: number) => v.toFixed(0), minMove: 1 },
    });
    const values = rsi(closesAll, 14);
    const points: { time: string; value: number }[] = [];
    for (let i = 0; i < filtered.length; i++) {
      const v = values[startIdx + i];
      const c = filtered[i];
      if (v != null && c) points.push({ time: c.date, value: v });
    }
    series.setData(points);
    for (const level of [30, 70]) {
      series.createPriceLine({
        price: level,
        color: colors.grid,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: false,
        title: "",
      });
    }
    chart.timeScale().fitContent();

    return () => {
      chart.remove();
    };
  }, [showRsi, filtered, startIdx, closesAll, resolvedTheme]);

  // ── derived readout & summary ─────────────────────────────────────
  const byDate = React.useMemo(() => {
    const m = new Map<string, { candle: Candle; index: number }>();
    filtered.forEach((c, i) => m.set(c.date, { candle: c, index: i }));
    return m;
  }, [filtered]);

  const last = filtered.length > 0 ? filtered[filtered.length - 1] : undefined;
  const readoutEntry = (hoveredDate ? byDate.get(hoveredDate) : undefined) ?? {
    candle: last,
    index: filtered.length - 1,
  };
  const readout = readoutEntry.candle;
  const readoutPrev =
    readoutEntry.index > 0
      ? filtered[readoutEntry.index - 1]
      : (all[startIdx - 1] ?? readoutEntry.candle);

  const first = filtered[0];
  const rangeChangePct =
    first && last && first.closeCents > 0 ? last.closeCents / first.closeCents - 1 : null;
  const rangeHigh = filtered.reduce((m, c) => Math.max(m, c.highCents), 0);
  const rangeLow = filtered.reduce((m, c) => Math.min(m, c.lowCents), Number.MAX_SAFE_INTEGER);

  // ── render ────────────────────────────────────────────────────────
  if (candlesQuery.isPending) {
    return (
      <div className="rounded-lg border border-line bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-9" />
            ))}
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-16" />
            ))}
          </div>
        </div>
        <Skeleton className="mt-3 h-4 w-2/3" />
        <Skeleton className="mt-3 h-[380px] w-full" />
      </div>
    );
  }

  if (candlesQuery.isError) {
    return (
      <ErrorState
        title="Couldn't load price history"
        description={candlesQuery.error.message}
        retry={() => void candlesQuery.refetch()}
      />
    );
  }

  if (!last || filtered.length === 0) {
    return (
      <EmptyState
        title="No price history"
        description={`No daily candles are available for ${symbol}.`}
      />
    );
  }

  const bundle = candlesQuery.data;
  const readoutChangeCents =
    readout && readoutPrev ? readout.closeCents - readoutPrev.closeCents : 0;

  return (
    <section
      aria-label={`${symbol} price chart`}
      className="rounded-lg border border-line bg-panel p-4"
    >
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="mr-1 flex items-center gap-0.5 rounded-md border border-line bg-panel-2 p-0.5">
            <button
              type="button"
              aria-pressed={chartType === "candles"}
              aria-label="Candlestick chart"
              title="Candlesticks"
              onClick={() => setChartType("candles")}
              disabled={compareActive}
              className={cn(
                "rounded-sm p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                chartType === "candles"
                  ? "bg-panel text-ink shadow-xs"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              <CandlestickChart className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-pressed={chartType === "line"}
              aria-label="Line chart"
              title="Line"
              onClick={() => setChartType("line")}
              disabled={compareActive}
              className={cn(
                "rounded-sm p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                chartType === "line"
                  ? "bg-panel text-ink shadow-xs"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              <ChartLine className="size-4" aria-hidden />
            </button>
          </div>
          {RANGES.map((r) => (
            <Chip key={r.key} active={range === r.key} onClick={() => setRange(r.key)}>
              {r.key}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {SMA_DEFS.map((def) => (
            <Chip
              key={def.key}
              active={indicators.has(def.key)}
              disabled={compareActive}
              title={compareActive ? "Indicators are hidden while comparing" : undefined}
              onClick={() =>
                setIndicators((prev) => {
                  const next = new Set(prev);
                  if (next.has(def.key)) next.delete(def.key);
                  else next.add(def.key);
                  return next;
                })
              }
            >
              {def.label}
            </Chip>
          ))}
          <Chip
            active={indicators.has("bb")}
            disabled={compareActive}
            title={compareActive ? "Indicators are hidden while comparing" : undefined}
            onClick={() =>
              setIndicators((prev) => {
                const next = new Set(prev);
                if (next.has("bb")) next.delete("bb");
                else next.add("bb");
                return next;
              })
            }
          >
            Bollinger (20,2)
          </Chip>
          <Chip active={showRsi} onClick={() => setShowRsi((v) => !v)}>
            RSI 14
          </Chip>
          {symbol !== "SPY" && (
            <Chip active={compare} onClick={() => setCompare((v) => !v)}>
              vs SPY
            </Chip>
          )}
        </div>
      </div>

      {/* Crosshair readout */}
      <div className="mt-3 flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {compareActive ? (
          <span className="text-ink-muted">
            Indexed to 100 at range start — relative performance of {symbol} vs SPY.
          </span>
        ) : readout ? (
          <>
            <span className="tnum font-medium text-ink">{readout.date}</span>
            <span className="tnum text-ink-muted">
              O <span className="text-ink">{fmtCents(readout.openCents)}</span>
            </span>
            <span className="tnum text-ink-muted">
              H <span className="text-ink">{fmtCents(readout.highCents)}</span>
            </span>
            <span className="tnum text-ink-muted">
              L <span className="text-ink">{fmtCents(readout.lowCents)}</span>
            </span>
            <span className="tnum text-ink-muted">
              C <span className="text-ink">{fmtCents(readout.closeCents)}</span>
            </span>
            <span
              className={cn(
                "tnum",
                readoutChangeCents > 0
                  ? "text-pos"
                  : readoutChangeCents < 0
                    ? "text-neg"
                    : "text-ink-muted",
              )}
            >
              {fmtCents(readoutChangeCents, { signed: true })}
            </span>
            <span className="tnum text-ink-muted">
              Vol <span className="text-ink">{fmtVolume(readout.volume)}</span>
            </span>
          </>
        ) : null}
        <span className="ml-auto flex items-center gap-2">
          {compare && symbol !== "SPY" && spyQuery.isFetching && (
            <span className="flex items-center gap-1 text-ink-faint">
              <Loader2 className="size-3 animate-spin" aria-hidden /> Loading SPY…
            </span>
          )}
          {compare && symbol !== "SPY" && spyQuery.isError && (
            <span className="text-warn">Couldn&apos;t load SPY for comparison</span>
          )}
          {bundle && (
            <SourceBadge synthetic={bundle.synthetic} source={bundle.source} asOf={bundle.asOf} />
          )}
        </span>
      </div>

      {/* Charts */}
      <div ref={containerRef} className="mt-2 h-[380px] w-full" />
      {showRsi && (
        <div className="mt-2 border-t border-line pt-2">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-faint">RSI (14)</p>
          <div ref={rsiRef} className="h-24 w-full" />
        </div>
      )}

      {/* Accessible plain-text summary */}
      {rangeChangePct != null && (
        <p className="mt-3 border-t border-line pt-3 text-xs text-ink-muted">
          {symbol} closed at {fmtCents(last.closeCents)} on {last.date}; {range} change{" "}
          {fmtPct(rangeChangePct, { signed: true })}; range high {fmtCents(rangeHigh)} low{" "}
          {fmtCents(rangeLow)}.
        </p>
      )}
    </section>
  );
}
