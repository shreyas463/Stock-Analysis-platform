"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { SourceBadge } from "@/components/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/misc";
import { fmtCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CompanyProfile, Fundamentals, Quote } from "@/lib/market-data/types";
import {
  fmtCentsOrDash,
  fmtEpsDollars,
  fmtMarketCapCents,
  fmtPctOrDash,
  fmtRatio,
  STAT_EXPLAINERS,
} from "./fmt";

export function StatLabel({ label, tip }: { label: string; tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="w-fit cursor-help border-b border-dotted border-line-strong text-[11px] uppercase tracking-wide text-ink-faint">
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

function Stat({ label, tip, children }: { label: string; tip: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <StatLabel label={label} tip={tip} />
      <span className="tnum text-sm font-medium text-ink">{children}</span>
    </div>
  );
}

/** Slim bar showing where the current price sits in the 52-week range. */
function FiftyTwoWeekBar({
  priceCents,
  lowCents,
  highCents,
}: {
  priceCents: number;
  lowCents: number;
  highCents: number;
}) {
  const span = highCents - lowCents;
  const pos = span > 0 ? Math.min(1, Math.max(0, (priceCents - lowCents) / span)) : 0.5;
  return (
    <div className="mt-1.5">
      <div className="relative h-1.5 rounded-full bg-panel-2">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-brand/25"
          style={{ width: `${pos * 100}%` }}
        />
        <div
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-panel bg-brand"
          style={{ left: `${pos * 100}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-ink-faint">
        <span className="tnum">{fmtCents(lowCents)}</span>
        <span className="tnum">{fmtCents(highCents)}</span>
      </div>
    </div>
  );
}

/** Labeled horizontal bar for a margin/growth fraction (pure divs). */
export function MetricBar({
  label,
  tip,
  value,
  tone,
  scaleMax = 1,
}: {
  label: string;
  tip: string;
  value: number | null;
  tone: "neutral" | "delta";
  scaleMax?: number;
}) {
  const width = value == null ? 0 : Math.min(1, Math.abs(value) / scaleMax) * 100;
  const barColor =
    tone === "neutral" ? "bg-brand/70" : value != null && value < 0 ? "bg-neg/70" : "bg-pos/70";
  return (
    <div className="flex items-center gap-3">
      <div className="w-36 shrink-0">
        <StatLabel label={label} tip={tip} />
      </div>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel-2">
        {value != null && (
          <div className={cn("h-full rounded-full", barColor)} style={{ width: `${width}%` }} />
        )}
      </div>
      <span
        className={cn(
          "tnum w-16 shrink-0 text-right text-xs font-medium",
          value == null
            ? "text-ink-faint"
            : tone === "delta"
              ? value < 0
                ? "text-neg"
                : "text-pos"
              : "text-ink",
        )}
      >
        {fmtPctOrDash(value, { digits: 1, signed: tone === "delta" })}
      </span>
    </div>
  );
}

export function hasMissingFundamentals(f: Fundamentals | null): boolean {
  if (!f) return true;
  return [
    f.peRatio,
    f.psRatio,
    f.pbRatio,
    f.epsTtm,
    f.dividendYield,
    f.payoutRatio,
    f.beta,
    f.high52wCents,
    f.low52wCents,
    f.grossMargin,
    f.operatingMargin,
    f.netMargin,
    f.roe,
    f.revenueGrowthYoY,
    f.epsGrowthYoY,
  ].some((v) => v == null);
}

export function MissingFundamentalsNote() {
  return (
    <p className="text-[11px] text-ink-faint">Some fundamentals unavailable for this symbol.</p>
  );
}

export function OverviewTab({
  quote,
  profile,
  fundamentals,
}: {
  quote: Quote | null;
  profile: CompanyProfile | null;
  fundamentals: Fundamentals | null;
}) {
  const f = fundamentals;
  const missing = hasMissingFundamentals(f);
  const priceCents = quote?.priceCents ?? null;

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Key statistics</CardTitle>
          {f && <SourceBadge synthetic={f.synthetic} source={f.source} asOf={f.asOf} />}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3">
            <Stat label="Market cap" tip={STAT_EXPLAINERS.marketCap}>
              {fmtMarketCapCents(profile?.marketCapCents ?? null)}
            </Stat>
            <Stat label="P/E (TTM)" tip={STAT_EXPLAINERS.pe}>
              {fmtRatio(f?.peRatio ?? null)}
            </Stat>
            <Stat label="P/S (TTM)" tip={STAT_EXPLAINERS.ps}>
              {fmtRatio(f?.psRatio ?? null)}
            </Stat>
            <Stat label="P/B" tip={STAT_EXPLAINERS.pb}>
              {fmtRatio(f?.pbRatio ?? null)}
            </Stat>
            <Stat label="EPS (TTM)" tip={STAT_EXPLAINERS.eps}>
              {fmtEpsDollars(f?.epsTtm ?? null)}
            </Stat>
            <Stat label="Dividend yield" tip={STAT_EXPLAINERS.dividendYield}>
              {fmtPctOrDash(f?.dividendYield ?? null)}
              {f?.payoutRatio != null && (
                <span className="ml-1.5 text-xs font-normal text-ink-muted">
                  ({fmtPctOrDash(f.payoutRatio, { digits: 0 })} payout)
                </span>
              )}
            </Stat>
            <Stat label="Beta" tip={STAT_EXPLAINERS.beta}>
              {fmtRatio(f?.beta ?? null)}
            </Stat>
            <div className="col-span-2 flex flex-col gap-1">
              <StatLabel label="52-week range" tip={STAT_EXPLAINERS.range52w} />
              {f?.low52wCents != null && f?.high52wCents != null ? (
                priceCents != null ? (
                  <FiftyTwoWeekBar
                    priceCents={priceCents}
                    lowCents={f.low52wCents}
                    highCents={f.high52wCents}
                  />
                ) : (
                  <span className="tnum text-sm font-medium">
                    {fmtCentsOrDash(f.low52wCents)} – {fmtCentsOrDash(f.high52wCents)}
                  </span>
                )
              ) : (
                <span className="tnum text-sm font-medium text-ink-faint">—</span>
              )}
            </div>
          </div>
          {missing && (
            <div className="mt-4 border-t border-line pt-3">
              <MissingFundamentalsNote />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          {profile && (
            <CardDescription>
              {[profile.exchange, profile.sector, profile.industry].filter(Boolean).join(" · ")}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {profile ? (
            <>
              <p className="font-medium text-ink">{profile.name}</p>
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand transition-colors hover:underline"
                >
                  {profile.website.replace(/^https?:\/\//, "")}
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              )}
              {profile.ipoDate && (
                <p className="text-xs text-ink-muted">
                  IPO <span className="tnum">{profile.ipoDate}</span>
                </p>
              )}
              {profile.description ? (
                <p className="text-xs leading-relaxed text-ink-muted">{profile.description}</p>
              ) : (
                <p className="text-xs text-ink-faint">No company description available.</p>
              )}
            </>
          ) : (
            <p className="text-xs text-ink-faint">Company profile unavailable for this symbol.</p>
          )}
        </CardContent>
      </Card>

      <Card className="xl:col-span-3">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Margins &amp; returns</CardTitle>
          {f && <span className="text-[11px] text-ink-faint">TTM, source: {f.source}</span>}
        </CardHeader>
        <CardContent>
          {f ? (
            <div className="grid gap-x-10 gap-y-3 md:grid-cols-2">
              <div className="space-y-3">
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
              </div>
              <div className="space-y-3">
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
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink-faint">Fundamentals unavailable for this symbol.</p>
          )}
          {f && missing && (
            <div className="mt-4 border-t border-line pt-3">
              <MissingFundamentalsNote />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
