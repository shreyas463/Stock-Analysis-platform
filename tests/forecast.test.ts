import { describe, expect, it } from "vitest";
import { computeForecast, ForecastError } from "@/lib/services/forecast";

/** Deterministic PRNG so tests never flake. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-12);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function makeSeries(
  n: number,
  nextReturn: (i: number, prevReturns: number[], rand: () => number) => number,
  seed = 42,
): { date: string; closeCents: number }[] {
  const rand = mulberry32(seed);
  const out: { date: string; closeCents: number }[] = [];
  const d = new Date(Date.UTC(2020, 0, 1));
  let price = Math.log(10_000);
  const returns: number[] = [];
  while (out.length < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
    const r = nextReturn(out.length, returns, rand);
    returns.push(r);
    price += r;
    out.push({ date: d.toISOString().slice(0, 10), closeCents: Math.round(Math.exp(price)) });
  }
  return out;
}

describe("forecast engine honesty", () => {
  it("refuses to forecast with insufficient history", () => {
    const short = makeSeries(30, (_i, _p, rand) => 0.01 * gaussian(rand));
    expect(() => computeForecast(short, 21)).toThrow(ForecastError);
  });

  it("rejects invalid horizons", () => {
    const series = makeSeries(400, (_i, _p, rand) => 0.01 * gaussian(rand));
    expect(() => computeForecast(series, 7)).toThrow(/Horizon/);
  });

  it("does NOT claim to beat the baseline on a pure random walk", () => {
    // A random walk is unforecastable by construction; an honest engine must
    // fall back to a baseline instead of advertising a model.
    const walk = makeSeries(600, (_i, _p, rand) => 0.015 * gaussian(rand));
    const result = computeForecast(walk, 21);
    expect(result.beatsBaseline).toBe(false);
    const chosen = result.validation.models.find((m) => m.chosen)!;
    expect(chosen.isBaseline).toBe(true);
  });

  it("detects strong autocorrelation and beats the baseline", () => {
    // Heavily mean-reverting AR(1) returns: phi = -0.8 with small noise.
    // Any competent AR model should crush the naive baseline here.
    const ar = makeSeries(600, (_i, prev, rand) => {
      const last = prev[prev.length - 1] ?? 0;
      return -0.8 * last + 0.004 * gaussian(rand) + 0.002;
    });
    const result = computeForecast(ar, 5);
    expect(result.beatsBaseline).toBe(true);
    const chosen = result.validation.models.find((m) => m.chosen)!;
    expect(chosen.isBaseline).toBe(false);
    expect(result.chosen.reason).toMatch(/improvement/);
  });

  it("produces an ordered, finite forecast band on future weekdays", () => {
    const series = makeSeries(500, (_i, _p, rand) => 0.01 * gaussian(rand) + 0.0005);
    const result = computeForecast(series, 10);
    expect(result.forecast).toHaveLength(10);
    const lastDate = series[series.length - 1]!.date;
    for (const point of result.forecast) {
      expect(point.loCents).toBeLessThanOrEqual(point.midCents);
      expect(point.hiCents).toBeGreaterThanOrEqual(point.midCents);
      expect(Number.isFinite(point.midCents)).toBe(true);
      expect(point.midCents).toBeGreaterThan(0);
      expect(point.date > lastDate).toBe(true);
      const day = new Date(`${point.date}T00:00:00Z`).getUTCDay();
      expect(day).toBeGreaterThan(0);
      expect(day).toBeLessThan(6);
    }
    // Band should widen with horizon (diffusion scaling).
    const first = result.forecast[0]!;
    const last = result.forecast[9]!;
    expect(last.hiCents - last.loCents).toBeGreaterThanOrEqual(first.hiCents - first.loCents);
  });

  it("always discloses limitations and validation size", () => {
    const series = makeSeries(400, (_i, _p, rand) => 0.012 * gaussian(rand));
    const result = computeForecast(series, 21, { synthetic: true });
    expect(result.limitations.length).toBeGreaterThanOrEqual(5);
    expect(result.limitations.join(" ")).toMatch(/not investment advice/i);
    expect(result.limitations[0]).toMatch(/synthetic/i);
    expect(result.validation.windows).toBeGreaterThanOrEqual(8);
    // Baselines are always part of the tournament that users see.
    const baselineCount = result.validation.models.filter((m) => m.isBaseline).length;
    expect(baselineCount).toBeGreaterThanOrEqual(3);
  });
});
