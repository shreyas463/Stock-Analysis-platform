/**
 * Forecast Lab — the honest replacement for the legacy app's fake ARIMA.
 *
 * What was wrong before: random confidence values, hardcoded "is_good_buy",
 * fabricated forecasts when data was missing, and no validation of any kind.
 *
 * What this engine does instead:
 *  - Candidate models (AR(p) on log returns — an ARIMA(p,1,0) equivalent —
 *    and damped Holt exponential smoothing) compete against three naive
 *    baselines (last close, random-walk-with-drift, SMA-20).
 *  - All models are scored by walk-forward validation: at each historical
 *    origin the model is fit ONLY on data before that origin and judged on
 *    the actual h-day-ahead outcome. No look-ahead.
 *  - A candidate is surfaced only if it beats the best baseline by a
 *    meaningful margin; otherwise the UI says so and shows the baseline's
 *    range as a volatility cone, not a prediction.
 *  - Prediction intervals are empirical quantiles of real out-of-sample
 *    errors — never an invented "confidence score".
 *
 * All math runs on log prices; money enters/leaves as integer cents.
 */

export type ForecastModelId = "naive" | "drift" | "sma20" | "ar" | "holt";

export type ForecastPoint = { date: string; midCents: number; loCents: number; hiCents: number };

export type ModelScore = {
  model: ForecastModelId;
  label: string;
  mape: number; // mean absolute percentage error, percent
  mae: number; // mean absolute error, cents
  isBaseline: boolean;
  chosen: boolean;
};

export type ForecastResult = {
  horizonDays: number;
  trainStart: string;
  trainEnd: string;
  lastCloseCents: number;
  beatsBaseline: boolean;
  chosen: {
    model: ForecastModelId;
    label: string;
    params: Record<string, number>;
    reason: string;
  };
  validation: { windows: number; horizonDays: number; models: ModelScore[] };
  forecast: ForecastPoint[];
  observed: { date: string; closeCents: number }[];
  limitations: string[];
};

export class ForecastError extends Error {
  status = 422;
}

const MIN_HISTORY = 60; // absolute floor (baselines only below MIN_CANDIDATE)
const MIN_CANDIDATE = 150; // candidates need enough data to fit + validate
const VALIDATION_WINDOWS = 40;

const LABELS: Record<ForecastModelId, string> = {
  naive: "Naive (last close)",
  drift: "Random walk with drift",
  sma20: "20-day moving average",
  ar: "Autoregressive AR(p) on returns",
  holt: "Damped Holt exponential smoothing",
};

// ── small linear algebra: solve A x = b (Gaussian elimination) ──────

function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r]![col]!) > Math.abs(m[pivot]![col]!)) pivot = r;
    }
    if (Math.abs(m[pivot]![col]!) < 1e-12) return null;
    [m[col], m[pivot]] = [m[pivot]!, m[col]!];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = m[r]![col]! / m[col]![col]!;
      for (let c = col; c <= n; c++) m[r]![c]! -= factor * m[col]![c]!;
    }
  }
  return m.map((row, i) => row[n]! / m[i]![i]!);
}

// ── model implementations (all operate on log prices) ───────────────

/** Fit AR(p) on log returns by OLS. Returns coefficients [c, φ1..φp]. */
function fitAR(logPrices: number[], p: number): number[] | null {
  const r: number[] = [];
  for (let i = 1; i < logPrices.length; i++) r.push(logPrices[i]! - logPrices[i - 1]!);
  const n = r.length - p;
  if (n < p * 3 + 10) return null;
  // Normal equations X'X beta = X'y
  const dim = p + 1;
  const xtx: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
  const xty: number[] = new Array(dim).fill(0);
  for (let i = p; i < r.length; i++) {
    const row = [1];
    for (let j = 1; j <= p; j++) row.push(r[i - j]!);
    for (let a = 0; a < dim; a++) {
      xty[a]! += row[a]! * r[i]!;
      for (let b = 0; b < dim; b++) xtx[a]![b]! += row[a]! * row[b]!;
    }
  }
  return solve(xtx, xty);
}

function forecastAR(logPrices: number[], coef: number[], h: number): number {
  const p = coef.length - 1;
  const recent: number[] = [];
  for (let i = logPrices.length - p; i < logPrices.length; i++) {
    recent.push(logPrices[i]! - logPrices[i - 1]!);
  }
  let level = logPrices[logPrices.length - 1]!;
  const window = [...recent]; // newest last
  for (let step = 0; step < h; step++) {
    let rhat = coef[0]!;
    for (let j = 1; j <= p; j++) rhat += coef[j]! * window[window.length - j]!;
    level += rhat;
    window.push(rhat);
  }
  return level;
}

/** AIC-based order selection for AR(p), p in 1..5, on a training slice. */
function selectArOrder(logPrices: number[]): number {
  let bestP = 1;
  let bestAic = Infinity;
  const r: number[] = [];
  for (let i = 1; i < logPrices.length; i++) r.push(logPrices[i]! - logPrices[i - 1]!);
  for (let p = 1; p <= 5; p++) {
    const coef = fitAR(logPrices, p);
    if (!coef) continue;
    let sse = 0;
    let n = 0;
    for (let i = p; i < r.length; i++) {
      let rhat = coef[0]!;
      for (let j = 1; j <= p; j++) rhat += coef[j]! * r[i - j]!;
      sse += (r[i]! - rhat) ** 2;
      n++;
    }
    if (n === 0 || sse <= 0) continue;
    const aic = n * Math.log(sse / n) + 2 * (p + 1);
    if (aic < bestAic) {
      bestAic = aic;
      bestP = p;
    }
  }
  return bestP;
}

type HoltParams = { alpha: number; beta: number; phi: number };

/** Run damped Holt over a series; return final level/trend and 1-step SSE. */
function runHolt(
  logPrices: number[],
  { alpha, beta, phi }: HoltParams,
): { level: number; trend: number; sse: number } {
  let level = logPrices[0]!;
  let trend = logPrices.length > 1 ? logPrices[1]! - logPrices[0]! : 0;
  let sse = 0;
  for (let i = 1; i < logPrices.length; i++) {
    const pred = level + phi * trend;
    const y = logPrices[i]!;
    sse += (y - pred) ** 2;
    const prevLevel = level;
    level = alpha * y + (1 - alpha) * pred;
    trend = beta * (level - prevLevel) + (1 - beta) * phi * trend;
  }
  return { level, trend, sse };
}

function forecastHolt(state: { level: number; trend: number }, phi: number, h: number): number {
  let dampSum = 0;
  let damp = phi;
  for (let i = 0; i < h; i++) {
    dampSum += damp;
    damp *= phi;
  }
  return state.level + dampSum * state.trend;
}

function selectHoltParams(logPrices: number[]): HoltParams {
  let best: HoltParams = { alpha: 0.5, beta: 0.1, phi: 0.95 };
  let bestSse = Infinity;
  for (const alpha of [0.2, 0.5, 0.8]) {
    for (const beta of [0.05, 0.15, 0.3]) {
      for (const phi of [0.85, 0.95, 0.99]) {
        const { sse } = runHolt(logPrices, { alpha, beta, phi });
        if (sse < bestSse) {
          bestSse = sse;
          best = { alpha, beta, phi };
        }
      }
    }
  }
  return best;
}

/** Point forecast (log price at t+h) for a model fit on logPrices[0..]. */
function pointForecast(
  model: ForecastModelId,
  logPrices: number[],
  h: number,
  fitted: { arOrder: number; holt: HoltParams },
): number | null {
  const last = logPrices[logPrices.length - 1]!;
  switch (model) {
    case "naive":
      return last;
    case "drift": {
      const n = logPrices.length;
      const meanRet = (logPrices[n - 1]! - logPrices[0]!) / (n - 1);
      return last + h * meanRet;
    }
    case "sma20": {
      const window = logPrices.slice(-20);
      return window.reduce((a, b) => a + b, 0) / window.length;
    }
    case "ar": {
      const coef = fitAR(logPrices, fitted.arOrder);
      if (!coef) return null;
      return forecastAR(logPrices, coef, h);
    }
    case "holt": {
      const state = runHolt(logPrices, fitted.holt);
      return forecastHolt(state, fitted.holt.phi, h);
    }
  }
}

// ── main entry ──────────────────────────────────────────────────────

export function computeForecast(
  closes: { date: string; closeCents: number }[],
  horizonDays: number,
  opts?: { synthetic?: boolean },
): ForecastResult {
  if (![5, 10, 21].includes(horizonDays)) {
    throw new ForecastError("Horizon must be 5, 10 or 21 trading days");
  }
  const series = closes.filter((c) => c.closeCents > 0);
  if (series.length < MIN_HISTORY) {
    throw new ForecastError(
      `Not enough price history to evaluate a forecast (${series.length} days available, ${MIN_HISTORY} required)`,
    );
  }

  const logPrices = series.map((c) => Math.log(c.closeCents));
  const n = logPrices.length;
  const candidatesEnabled = n >= MIN_CANDIDATE;

  // Hyper-parameters are selected ONCE on the pre-validation portion so the
  // validation windows stay out-of-sample for selection too.
  const h = horizonDays;
  const windows = Math.min(VALIDATION_WINDOWS, Math.max(10, Math.floor(n / 6)));
  const firstOrigin = n - windows - h; // train slice = [0, origin], target = origin + h
  if (firstOrigin < MIN_HISTORY - h) {
    throw new ForecastError("Not enough price history for walk-forward validation");
  }
  const preValidation = logPrices.slice(0, firstOrigin + 1);
  const fitted = {
    arOrder: candidatesEnabled ? selectArOrder(preValidation) : 1,
    holt: candidatesEnabled
      ? selectHoltParams(preValidation)
      : { alpha: 0.5, beta: 0.1, phi: 0.95 },
  };

  const models: ForecastModelId[] = candidatesEnabled
    ? ["naive", "drift", "sma20", "ar", "holt"]
    : ["naive", "drift", "sma20"];

  // Walk-forward validation.
  const errors: Record<string, number[]> = {}; // log-scale signed errors (actual - predicted)
  const absPctErrors: Record<string, number[]> = {};
  const absErrors: Record<string, number[]> = {};
  for (const m of models) {
    errors[m] = [];
    absPctErrors[m] = [];
    absErrors[m] = [];
  }

  let evaluated = 0;
  for (let origin = firstOrigin; origin + h < n; origin++) {
    const train = logPrices.slice(0, origin + 1);
    const actualLog = logPrices[origin + h]!;
    const actualCents = series[origin + h]!.closeCents;
    for (const m of models) {
      const predLog = pointForecast(m, train, h, fitted);
      if (predLog === null || !Number.isFinite(predLog)) continue;
      const predCents = Math.exp(predLog);
      errors[m]!.push(actualLog - predLog);
      absErrors[m]!.push(Math.abs(actualCents - predCents));
      absPctErrors[m]!.push(Math.abs(actualCents - predCents) / actualCents);
    }
    evaluated++;
  }

  if (evaluated < 8) {
    throw new ForecastError("Not enough validation windows to evaluate forecast quality");
  }

  const scores = models
    .filter((m) => absPctErrors[m]!.length >= Math.max(5, evaluated * 0.8))
    .map((m) => ({
      model: m,
      label: LABELS[m],
      mape: (absPctErrors[m]!.reduce((a, b) => a + b, 0) / absPctErrors[m]!.length) * 100,
      mae: absErrors[m]!.reduce((a, b) => a + b, 0) / absErrors[m]!.length,
      isBaseline: m === "naive" || m === "drift" || m === "sma20",
      chosen: false,
    }));

  const baselines = scores.filter((s) => s.isBaseline);
  const candidates = scores.filter((s) => !s.isBaseline);
  const bestBaseline = baselines.reduce((a, b) => (b.mape < a.mape ? b : a));
  const bestCandidate =
    candidates.length > 0 ? candidates.reduce((a, b) => (b.mape < a.mape ? b : a)) : null;

  // A candidate must beat the best baseline by ≥3% relative MAPE to be shown.
  const beatsBaseline = bestCandidate !== null && bestCandidate.mape < bestBaseline.mape * 0.97;
  const chosenScore = beatsBaseline ? bestCandidate! : bestBaseline;
  chosenScore.chosen = true;

  const improvement =
    bestCandidate !== null
      ? ((bestBaseline.mape - bestCandidate.mape) / bestBaseline.mape) * 100
      : null;

  const reason = beatsBaseline
    ? `${chosenScore.label} achieved ${chosenScore.mape.toFixed(2)}% MAPE vs ${bestBaseline.mape.toFixed(2)}% for the best baseline (${bestBaseline.label.toLowerCase()}) across ${evaluated} walk-forward windows — a ${improvement!.toFixed(1)}% relative improvement. Selected automatically; hyper-parameters were tuned only on data before the validation period.`
    : bestCandidate
      ? `No candidate model beat the best baseline: ${bestCandidate.label.toLowerCase()} scored ${bestCandidate.mape.toFixed(2)}% MAPE vs ${bestBaseline.mape.toFixed(2)}% for ${bestBaseline.label.toLowerCase()} across ${evaluated} windows. Basis refuses to dress a baseline up as a model, so the ${bestBaseline.label.toLowerCase()} range is shown instead.`
      : `History is too short to fit candidate models, so the ${bestBaseline.label.toLowerCase()} baseline range is shown (${evaluated} validation windows).`;

  // Final forecast from the chosen model on the FULL history.
  const finalLog = pointForecast(chosenScore.model, logPrices, h, fitted);
  if (finalLog === null) throw new ForecastError("Model fit failed on the full history");

  // Interpolate the mid path across the horizon and build the empirical band.
  const lastLog = logPrices[n - 1]!;
  const chosenErrors = errors[chosenScore.model]!.slice().sort((a, b) => a - b);
  const q = (arr: number[], p: number): number => {
    if (arr.length === 0) return 0;
    const idx = Math.min(arr.length - 1, Math.max(0, Math.floor(p * arr.length)));
    return arr[idx]!;
  };
  const q10 = q(chosenErrors, 0.1);
  const q90 = q(chosenErrors, 0.9);

  const futureDates = nextTradingDays(series[n - 1]!.date, h);
  const forecast: ForecastPoint[] = futureDates.map((date, i) => {
    const step = i + 1;
    const frac = step / h;
    const midLog = lastLog + (finalLog - lastLog) * frac;
    // Errors were measured at horizon h; scale the band by sqrt(step/h)
    // (diffusion scaling) so nearer days get a narrower band.
    const scale = Math.sqrt(frac);
    return {
      date,
      midCents: Math.round(Math.exp(midLog)),
      loCents: Math.round(Math.exp(midLog + q10 * scale)),
      hiCents: Math.round(Math.exp(midLog + q90 * scale)),
    };
  });

  const limitations = [
    `Validated on the last ${evaluated} overlapping ${h}-day windows only — market regimes change and past error rates do not bound future ones.`,
    "The band is the empirical 10th–90th percentile of this model's own out-of-sample errors (~80% historical coverage), not a guarantee.",
    "Daily closes only; no earnings, news, or intraday information enters the model.",
    "Forecasts of this kind mainly extrapolate drift and mean-reversion; they cannot anticipate discrete events.",
    "Educational tool — not investment advice.",
  ];
  if (opts?.synthetic) {
    limitations.unshift(
      "Demo mode: this forecast runs on synthetic prices, so it demonstrates the method, not any real company.",
    );
  }
  if (!candidatesEnabled) {
    limitations.push(
      `Fewer than ${MIN_CANDIDATE} days of history — only baseline methods were evaluated.`,
    );
  }

  const params: Record<string, number> =
    chosenScore.model === "ar"
      ? { p: fitted.arOrder }
      : chosenScore.model === "holt"
        ? { alpha: fitted.holt.alpha, beta: fitted.holt.beta, phi: fitted.holt.phi }
        : {};

  return {
    horizonDays: h,
    trainStart: series[0]!.date,
    trainEnd: series[n - 1]!.date,
    lastCloseCents: series[n - 1]!.closeCents,
    beatsBaseline,
    chosen: { model: chosenScore.model, label: chosenScore.label, params, reason },
    validation: {
      windows: evaluated,
      horizonDays: h,
      models: scores.sort((a, b) => a.mape - b.mape),
    },
    forecast,
    observed: series.slice(-120).map((c) => ({ date: c.date, closeCents: c.closeCents })),
    limitations,
  };
}

function nextTradingDays(fromDate: string, count: number): string[] {
  const out: string[] = [];
  const d = new Date(`${fromDate}T00:00:00Z`);
  while (out.length < count) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
