"use client";

import * as React from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtCents } from "@/lib/money";

type Snapshot = { date: string; totalValueCents: number };

type ChartColors = { line: string; tick: string };

function useChartColors(): ChartColors | null {
  const [colors, setColors] = React.useState<ChartColors | null>(null);
  React.useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    setColors({
      line: style.getPropertyValue("--chart-1").trim(),
      tick: style.getPropertyValue("--ink-faint").trim(),
    });
  }, []);
  return colors;
}

function fmtTickDate(value: string): string {
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

const compactUsd = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: number | string }>;
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;
  return (
    <div className="rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs shadow-sm">
      <p className="text-ink-muted">{typeof label === "string" ? fmtTickDate(label) : label}</p>
      <p className="tnum mt-0.5 font-semibold text-ink">
        {typeof value === "number" ? fmtCents(value) : "—"}
      </p>
    </div>
  );
}

/** Area chart of daily portfolio-value snapshots. Parent controls the card. */
export function PerformanceChart({ snapshots }: { snapshots: Snapshot[] }) {
  const colors = useChartColors();
  const data = React.useMemo(
    () => snapshots.map((s) => ({ date: s.date, value: s.totalValueCents })),
    [snapshots],
  );

  return (
    <div className="h-64 w-full">
      {colors && (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="dashboard-perf-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.line} stopOpacity={0.32} />
                <stop offset="100%" stopColor={colors.line} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fill: colors.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtTickDate}
              minTickGap={48}
            />
            <YAxis
              tick={{ fill: colors.tick, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={52}
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => `$${compactUsd.format(v / 100)}`}
            />
            <Tooltip
              content={<ChartTip />}
              cursor={{ stroke: colors.tick, strokeDasharray: "3 3" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={colors.line}
              strokeWidth={2}
              fill="url(#dashboard-perf-fill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
