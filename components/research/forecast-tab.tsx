"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import {
  Area,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FlaskConical, Info, TriangleAlert } from "lucide-react";
import { EmptyState, ErrorState, SourceBadge } from "@/components/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ApiClientError } from "@/lib/client";
import { fmtCents } from "@/lib/money";
import { cn } from "@/lib/utils";

type ForecastResponse = {
  symbol: string;
  horizonDays: number;
  synthetic: boolean;
  source: string;
  trainStart: string;
  trainEnd: string;
  lastCloseCents: number;
  beatsBaseline: boolean;
  chosen: { model: string; label: string; params: Record<string, unknown>; reason: string };
  validation: {
    windows: number;
    horizonDays: number;
    models: {
      model: string;
      label: string;
      mape: number;
      mae: number;
      isBaseline: boolean;
      chosen: boolean;
    }[];
  };
  forecast: { date: string; midCents: number; loCents: number; hiCents: number }[];
  observed: { date: string; closeCents: number }[];
  limitations: string[];
};

type ChartRow = {
  date: string;
  close?: number;
  mid?: number;
  band?: [number, number];
};

const HORIZONS = [5, 10, 21] as const;
type Horizon = (typeof HORIZONS)[number];

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function ForecastTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number | [number, number] }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const get = (key: string) => payload.find((p) => p.dataKey === key)?.value;
  const close = get("close");
  const mid = get("mid");
  const band = get("band");
  return (
    <div className="rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs shadow-md">
      <p className="tnum font-medium text-ink">{label}</p>
      {typeof close === "number" && (
        <p className="tnum text-ink-muted">
          Close <span className="text-ink">${close.toFixed(2)}</span>
        </p>
      )}
      {typeof mid === "number" && (
        <p className="tnum text-ink-muted">
          Forecast mid <span className="text-ink">${mid.toFixed(2)}</span>
        </p>
      )}
      {Array.isArray(band) && band.length === 2 && band[0] !== band[1] && (
        <p className="tnum text-ink-muted">
          80% range{" "}
          <span className="text-ink">
            ${band[0]!.toFixed(2)} – ${band[1]!.toFixed(2)}
          </span>
        </p>
      )}
    </div>
  );
}

function ForecastSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {HORIZONS.map((h) => (
          <Skeleton key={h} className="h-7 w-24" />
        ))}
      </div>
      <div className="rounded-lg border border-line bg-panel p-4">
        <Skeleton className="h-64 w-full" />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-lg border border-line bg-panel p-4 xl:col-span-2">
          <Skeleton className="h-4 w-36" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-panel p-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-3 h-20 w-full" />
        </div>
      </div>
    </div>
  );
}

export function ForecastTab({ symbol }: { symbol: string }) {
  const { resolvedTheme } = useTheme();
  const [horizon, setHorizon] = React.useState<Horizon>(21);

  const query = useQuery({
    queryKey: ["forecast", symbol, horizon],
    queryFn: () =>
      api<ForecastResponse>(
        `/api/stocks/${encodeURIComponent(symbol)}/forecast?horizon=${horizon}`,
      ),
    staleTime: 5 * 60_000,
    retry: (failureCount, error) => {
      if (error instanceof ApiClientError && error.status >= 400 && error.status < 500)
        return false;
      return failureCount < 2;
    },
  });

  const [colors, setColors] = React.useState({
    observed: "#7c93ee",
    forecast: "#e2b93b",
    grid: "#232937",
    text: "#98a2b5",
  });
  React.useEffect(() => {
    setColors({
      observed: cssVar("--chart-1", "#7c93ee"),
      forecast: cssVar("--chart-3", "#e2b93b"),
      grid: cssVar("--line", "#232937"),
      text: cssVar("--ink-muted", "#98a2b5"),
    });
  }, [resolvedTheme]);

  const data = query.data;

  const rows = React.useMemo<ChartRow[]>(() => {
    if (!data) return [];
    const out: ChartRow[] = data.observed.map((o) => ({
      date: o.date,
      close: o.closeCents / 100,
    }));
    // Bridge point: forecast line and band start exactly at the last close.
    const lastObserved = out[out.length - 1];
    if (lastObserved && lastObserved.close != null) {
      lastObserved.mid = lastObserved.close;
      lastObserved.band = [lastObserved.close, lastObserved.close];
    }
    for (const f of data.forecast) {
      out.push({
        date: f.date,
        mid: f.midCents / 100,
        band: [f.loCents / 100, f.hiCents / 100],
      });
    }
    return out;
  }, [data]);

  const horizonPills = (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Forecast horizon">
      {HORIZONS.map((h) => (
        <button
          key={h}
          type="button"
          aria-pressed={horizon === h}
          onClick={() => setHorizon(h)}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
            horizon === h
              ? "border-brand/50 bg-brand-soft text-brand"
              : "border-line bg-panel text-ink-muted hover:border-line-strong hover:text-ink",
          )}
        >
          {h} trading days
        </button>
      ))}
    </div>
  );

  if (query.isPending) return <ForecastSkeleton />;

  if (query.isError) {
    const err = query.error;
    if (err instanceof ApiClientError && (err.status === 422 || err.status === 404)) {
      return (
        <div className="space-y-4">
          {horizonPills}
          <EmptyState
            icon={<FlaskConical aria-hidden />}
            title="Forecast unavailable"
            description={err.message}
          />
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {horizonPills}
        <ErrorState
          title="Couldn't load the forecast"
          description={err.message}
          retry={() => void query.refetch()}
        />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {horizonPills}
        <div className="flex items-center gap-2">
          <SourceBadge synthetic={data.synthetic} source={data.source} />
          <span className="text-[11px] text-ink-faint">
            Trained on {data.trainStart} → {data.trainEnd}
          </span>
        </div>
      </div>

      {!data.beatsBaseline && (
        <div className="flex items-start gap-2.5 rounded-md border border-warn/40 bg-warn-soft px-3 py-2.5">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
          <p className="text-sm text-ink">
            No model beat the naive baseline in validation — read the band as a volatility range,
            not a prediction.
          </p>
        </div>
      )}

      {/* Forecast chart */}
      <div className="rounded-lg border border-line bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold tracking-tight">
            {data.horizonDays}-day projection from {fmtCents(data.lastCloseCents)}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded" style={{ backgroundColor: colors.observed }} />
              Observed close
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-0 w-4 border-t-2 border-dashed"
                style={{ borderColor: colors.forecast }}
              />
              Forecast (median)
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-4 rounded-sm"
                style={{ backgroundColor: colors.forecast, opacity: 0.25 }}
              />
              Estimated 80% range
            </span>
          </div>
        </div>
        <div className="mt-3 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: colors.text }}
                tickLine={false}
                axisLine={{ stroke: colors.grid }}
                minTickGap={48}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 10, fill: colors.text }}
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              />
              <RechartsTooltip content={<ForecastTooltip />} />
              <Area
                dataKey="band"
                stroke="none"
                fill={colors.forecast}
                fillOpacity={0.14}
                isAnimationActive={false}
                connectNulls
              />
              <Line
                dataKey="close"
                stroke={colors.observed}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                dataKey="mid"
                stroke={colors.forecast}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">
          Shaded area is the estimated 80% range — roughly 1 in 5 outcomes should land outside it.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Model tournament */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Model tournament</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">MAPE %</TableHead>
                  <TableHead className="text-right">MAE $</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.validation.models.map((m) => (
                  <TableRow key={m.model} className={cn(m.chosen && "bg-brand-soft/40")}>
                    <TableCell className="font-medium text-ink">{m.label}</TableCell>
                    {/* mape arrives as a percentage (e.g. 9.48 = 9.48%), mae as cents */}
                    <TableCell className="tnum text-right">{m.mape.toFixed(2)}%</TableCell>
                    <TableCell className="tnum text-right">{fmtCents(m.mae)}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1.5">
                        {m.isBaseline && <Badge variant="secondary">baseline</Badge>}
                        {m.chosen && <Badge>chosen</Badge>}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="border-t border-line px-4 py-2.5 text-[11px] text-ink-faint">
              Walk-forward validation, {data.validation.windows} origins ending {data.trainEnd}
            </p>
          </CardContent>
        </Card>

        {/* Why this model */}
        <Card>
          <CardHeader>
            <CardTitle>Why this model</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-ink">{data.chosen.label}</p>
            <blockquote className="mt-2 border-l-2 border-brand/50 pl-3 text-xs leading-relaxed text-ink-muted">
              {data.chosen.reason}
            </blockquote>
          </CardContent>
        </Card>
      </div>

      {/* Limitations */}
      {data.limitations.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Info className="size-4 text-ink-muted" aria-hidden />
            <CardTitle>Read this first</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-ink-muted">
              {data.limitations.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
