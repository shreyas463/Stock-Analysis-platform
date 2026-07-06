import { fmtCents, fmtPct } from "@/lib/money";

/** Presentation helpers for fundamentals — nulls always render as an em dash. */

export function fmtMarketCapCents(cents: number | null): string {
  if (cents == null) return "—";
  const dollars = cents / 100;
  const abs = Math.abs(dollars);
  if (abs >= 1e12) return `$${(dollars / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(dollars / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(dollars / 1e6).toFixed(2)}M`;
  return fmtCents(cents);
}

export function fmtRatio(value: number | null, digits = 2): string {
  return value == null ? "—" : value.toFixed(digits);
}

/** EPS arrives as dollars per share (not cents). */
export function fmtEpsDollars(value: number | null): string {
  return value == null ? "—" : `$${value.toFixed(2)}`;
}

export function fmtPctOrDash(
  value: number | null,
  opts?: { signed?: boolean; digits?: number },
): string {
  return value == null ? "—" : fmtPct(value, opts);
}

export function fmtCentsOrDash(cents: number | null): string {
  return cents == null ? "—" : fmtCents(cents);
}

export function fmtVolume(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return volume.toLocaleString("en-US");
}

/** One-sentence plain-English explainers for key statistics tooltips. */
export const STAT_EXPLAINERS = {
  marketCap: "Total market value of all outstanding shares at the current price.",
  pe: "Price divided by earnings per share over the trailing twelve months — how many dollars you pay per dollar of annual profit.",
  ps: "Price divided by revenue per share — useful when a company has little or no profit yet.",
  pb: "Price relative to the accounting book value of the company's net assets.",
  eps: "Profit attributable to each share over the trailing twelve months.",
  dividendYield: "Annual dividends as a percentage of the current share price.",
  payoutRatio:
    "The share of earnings paid out as dividends — very high ratios leave less room to reinvest.",
  beta: "Historical sensitivity to the overall market: 1 moves with the market, above 1 swings harder, below 1 is steadier.",
  range52w:
    "The lowest and highest prices over the past year, with a marker where today's price sits.",
  grossMargin: "Revenue left after the direct cost of producing goods or services.",
  operatingMargin: "Profit from core operations as a share of revenue, before interest and taxes.",
  netMargin: "The share of revenue that survives as bottom-line profit.",
  roe: "Net income as a percentage of shareholders' equity — how efficiently the company turns owner capital into profit.",
  revenueGrowth: "Change in trailing-twelve-month revenue versus the prior year.",
  epsGrowth: "Change in trailing-twelve-month earnings per share versus the prior year.",
  debtToEquity: "Total debt relative to shareholders' equity — higher means more leverage.",
  currentRatio:
    "Short-term assets divided by short-term liabilities — ability to cover near-term obligations.",
} as const;
