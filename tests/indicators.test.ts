import { describe, expect, it } from "vitest";
import {
  beta,
  correlation,
  dailyReturns,
  historicalVaR,
  maxDrawdown,
  rsi,
  sharpe,
  sma,
} from "@/lib/analytics/indicators";

describe("indicators", () => {
  it("sma matches hand-computed values and warm-up is null", () => {
    const out = sma([1, 2, 3, 4, 5], 3);
    expect(out).toEqual([null, null, 2, 3, 4]);
  });

  it("rsi is 100 on monotonic gains and low on monotonic losses", () => {
    const up = Array.from({ length: 30 }, (_, i) => 100 + i);
    const upRsi = rsi(up, 14);
    expect(upRsi[upRsi.length - 1]).toBe(100);

    const down = Array.from({ length: 30 }, (_, i) => 100 - i);
    const downRsi = rsi(down, 14);
    expect(downRsi[downRsi.length - 1]).toBe(0);
  });

  it("maxDrawdown finds the deepest peak-to-trough", () => {
    const values = [100, 120, 90, 110, 60, 100];
    const { drawdown, peakIndex, troughIndex } = maxDrawdown(values);
    expect(drawdown).toBeCloseTo(0.5); // 120 → 60
    expect(peakIndex).toBe(1);
    expect(troughIndex).toBe(4);
  });

  it("dailyReturns computes simple returns", () => {
    const out = dailyReturns([100, 110, 99]);
    expect(out[0]).toBeCloseTo(0.1);
    expect(out[1]).toBeCloseTo(-0.1);
  });

  it("beta of a series against itself is 1, correlation is 1", () => {
    const r = [0.01, -0.02, 0.015, 0.005, -0.01, 0.02, -0.005];
    expect(beta(r, r)).toBeCloseTo(1);
    expect(correlation(r, r)).toBeCloseTo(1);
  });

  it("beta scales with leverage", () => {
    const market = [0.01, -0.02, 0.015, 0.005, -0.01, 0.02, -0.005];
    const levered = market.map((x) => 2 * x);
    expect(beta(levered, market)).toBeCloseTo(2);
  });

  it("historical VaR is the empirical tail quantile", () => {
    const returns = Array.from({ length: 100 }, (_, i) => (i - 50) / 1000); // -5%..+4.9%
    // 5th percentile ≈ -4.5%
    expect(historicalVaR(returns, 0.95)).toBeCloseTo(0.045, 2);
  });

  it("sharpe is zero for constant returns", () => {
    expect(sharpe([0.01, 0.01, 0.01])).toBe(0);
  });
});
