"use client";

import * as React from "react";
import { SourceBadge } from "@/components/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CompanyProfile, Fundamentals } from "@/lib/market-data/types";
import { fmtEpsDollars, fmtMarketCapCents, fmtPctOrDash, fmtRatio, STAT_EXPLAINERS } from "./fmt";
import {
  hasMissingFundamentals,
  MetricBar,
  MissingFundamentalsNote,
  StatLabel,
} from "./overview-tab";

function ValueRow({
  label,
  tip,
  value,
  hint,
}: {
  label: string;
  tip: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-2 last:border-0">
      <StatLabel label={label} tip={tip} />
      <span
        className={cn("tnum text-sm font-medium", value === "—" ? "text-ink-faint" : "text-ink")}
      >
        {value}
        {hint && value !== "—" && (
          <span className="ml-1.5 text-xs font-normal text-ink-muted">{hint}</span>
        )}
      </span>
    </div>
  );
}

export function FinancialsTab({
  profile,
  fundamentals,
}: {
  profile: CompanyProfile | null;
  fundamentals: Fundamentals | null;
}) {
  const f = fundamentals;
  const missing = hasMissingFundamentals(f);

  if (!f) {
    return (
      <div className="rounded-lg border border-dashed border-line px-6 py-10 text-center">
        <p className="text-sm font-medium text-ink">Fundamentals unavailable</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-ink-muted">
          No financial metrics could be loaded for this symbol. The provider may not cover it, or
          the request failed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-muted">
          Trailing-twelve-month figures. Values reflect the most recent provider snapshot — always
          confirm against filings before acting on them.
        </p>
        <SourceBadge synthetic={f.synthetic} source={f.source} asOf={f.asOf} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Valuation</CardTitle>
            <CardDescription>What the market pays for earnings, sales, and assets</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <ValueRow
              label="Market cap"
              tip={STAT_EXPLAINERS.marketCap}
              value={fmtMarketCapCents(profile?.marketCapCents ?? null)}
            />
            <ValueRow label="P/E (TTM)" tip={STAT_EXPLAINERS.pe} value={fmtRatio(f.peRatio)} />
            <ValueRow label="P/S (TTM)" tip={STAT_EXPLAINERS.ps} value={fmtRatio(f.psRatio)} />
            <ValueRow label="P/B" tip={STAT_EXPLAINERS.pb} value={fmtRatio(f.pbRatio)} />
            <ValueRow label="EPS (TTM)" tip={STAT_EXPLAINERS.eps} value={fmtEpsDollars(f.epsTtm)} />
            <ValueRow
              label="Dividend yield"
              tip={STAT_EXPLAINERS.dividendYield}
              value={fmtPctOrDash(f.dividendYield)}
            />
            <ValueRow
              label="Payout ratio"
              tip={STAT_EXPLAINERS.payoutRatio}
              value={fmtPctOrDash(f.payoutRatio, { digits: 0 })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Balance sheet &amp; risk</CardTitle>
            <CardDescription>Leverage, liquidity, and market sensitivity</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <ValueRow
              label="Debt / equity"
              tip={STAT_EXPLAINERS.debtToEquity}
              value={fmtRatio(f.debtToEquity)}
            />
            <ValueRow
              label="Current ratio"
              tip={STAT_EXPLAINERS.currentRatio}
              value={fmtRatio(f.currentRatio)}
            />
            <ValueRow label="Beta" tip={STAT_EXPLAINERS.beta} value={fmtRatio(f.beta)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profitability</CardTitle>
            <CardDescription>How much of each revenue dollar survives</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetricBar
              label="Gross margin"
              tip={STAT_EXPLAINERS.grossMargin}
              value={f.grossMargin}
              tone="neutral"
            />
            <MetricBar
              label="Operating margin"
              tip={STAT_EXPLAINERS.operatingMargin}
              value={f.operatingMargin}
              tone="neutral"
            />
            <MetricBar
              label="Net margin"
              tip={STAT_EXPLAINERS.netMargin}
              value={f.netMargin}
              tone="neutral"
            />
            <MetricBar label="ROE" tip={STAT_EXPLAINERS.roe} value={f.roe} tone="neutral" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Growth</CardTitle>
            <CardDescription>Year-over-year change, trailing twelve months</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetricBar
              label="Revenue growth YoY"
              tip={STAT_EXPLAINERS.revenueGrowth}
              value={f.revenueGrowthYoY}
              tone="delta"
              scaleMax={0.5}
            />
            <MetricBar
              label="EPS growth YoY"
              tip={STAT_EXPLAINERS.epsGrowth}
              value={f.epsGrowthYoY}
              tone="delta"
              scaleMax={0.5}
            />
          </CardContent>
        </Card>
      </div>

      {missing && <MissingFundamentalsNote />}
    </div>
  );
}
