/**
 * Pure, deterministic technical/statistical helpers.
 * All functions operate on plain number arrays (typically closes in cents —
 * scale-invariant math, so cents vs dollars does not matter).
 */

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i]!;
    if (i >= period) sum -= values[i - period]!;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    if (prev === null) {
      if (i === period - 1) {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += values[j]!;
        prev = sum / period;
        out[i] = prev;
      }
    } else {
      prev = v * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

/** Wilder's RSI. */
export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i]! - values[i - 1]!;
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i]! - values[i - 1]!;
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export function macd(
  values: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const macdLine = values.map((_, i) =>
    emaFast[i] !== null && emaSlow[i] !== null ? emaFast[i]! - emaSlow[i]! : null,
  );
  const firstIdx = macdLine.findIndex((v) => v !== null);
  const compact = macdLine.filter((v): v is number => v !== null);
  const signalCompact = ema(compact, signalPeriod);
  const signal: (number | null)[] = new Array(values.length).fill(null);
  signalCompact.forEach((v, i) => {
    if (v !== null) signal[firstIdx + i] = v;
  });
  const histogram = macdLine.map((v, i) =>
    v !== null && signal[i] !== null ? v - signal[i]! : null,
  );
  return { macd: macdLine, signal, histogram };
}

export function bollinger(
  values: number[],
  period = 20,
  mult = 2,
): { middle: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const middle = sma(values, period);
  const upper: (number | null)[] = new Array(values.length).fill(null);
  const lower: (number | null)[] = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const m = middle[i];
    if (m == null) continue;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (values[j]! - m) ** 2;
    const sd = Math.sqrt(variance / period);
    upper[i] = m + mult * sd;
    lower[i] = m - mult * sd;
  }
  return { middle, upper, lower };
}

/** Simple daily returns (fractions). Output length = input length - 1. */
export function dailyReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1]!;
    if (prev > 0) out.push(closes[i]! / prev - 1);
  }
  return out;
}

export function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

export function annualizedVol(returns: number[]): number {
  return stddev(returns) * Math.sqrt(252);
}

export function annualizedReturn(totalReturn: number, days: number): number {
  if (days <= 0) return 0;
  return Math.pow(1 + totalReturn, 252 / days) - 1;
}

/** Sharpe on daily returns (rf = 0 unless provided as daily rate). */
export function sharpe(returns: number[], rfDaily = 0): number {
  const sd = stddev(returns);
  if (sd === 0) return 0;
  return ((mean(returns) - rfDaily) / sd) * Math.sqrt(252);
}

export function sortino(returns: number[], rfDaily = 0): number {
  const downside = returns.filter((r) => r < rfDaily).map((r) => (r - rfDaily) ** 2);
  if (downside.length === 0) return 0;
  const dd = Math.sqrt(downside.reduce((a, b) => a + b, 0) / returns.length);
  if (dd === 0) return 0;
  return ((mean(returns) - rfDaily) / dd) * Math.sqrt(252);
}

/** Max drawdown as a positive fraction (0.25 = -25%). Also returns window. */
export function maxDrawdown(values: number[]): {
  drawdown: number;
  peakIndex: number;
  troughIndex: number;
} {
  let peak = -Infinity;
  let peakIdx = 0;
  let best = { drawdown: 0, peakIndex: 0, troughIndex: 0 };
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    if (v > peak) {
      peak = v;
      peakIdx = i;
    } else if (peak > 0) {
      const dd = (peak - v) / peak;
      if (dd > best.drawdown) best = { drawdown: dd, peakIndex: peakIdx, troughIndex: i };
    }
  }
  return best;
}

export function covariance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let sum = 0;
  for (let i = 0; i < n; i++) sum += (a[i]! - ma) * (b[i]! - mb);
  return sum / (n - 1);
}

export function correlation(a: number[], b: number[]): number {
  const sd = stddev(a) * stddev(b);
  if (sd === 0) return 0;
  return covariance(a, b) / sd;
}

/** Beta of asset returns vs benchmark returns. */
export function beta(asset: number[], benchmark: number[]): number {
  const varB = stddev(benchmark) ** 2;
  if (varB === 0) return 0;
  return covariance(asset, benchmark) / varB;
}

/**
 * Historical Value-at-Risk (positive fraction) at the given confidence.
 * Empirical quantile of the return distribution — explicitly NOT a guarantee.
 */
export function historicalVaR(returns: number[], confidence = 0.95): number {
  if (returns.length < 20) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const idx = Math.floor((1 - confidence) * sorted.length);
  return Math.max(0, -(sorted[Math.min(idx, sorted.length - 1)] ?? 0));
}

/** Expected shortfall: mean loss beyond the VaR cutoff. */
export function expectedShortfall(returns: number[], confidence = 0.95): number {
  if (returns.length < 40) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const cutoff = Math.max(1, Math.floor((1 - confidence) * sorted.length));
  const tail = sorted.slice(0, cutoff);
  return Math.max(0, -mean(tail));
}
