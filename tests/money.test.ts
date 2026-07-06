import { describe, expect, it } from "vitest";
import {
  averageCostCents,
  fmtCents,
  notionalCents,
  qtyE4ToShares,
  realizedPnlCents,
  toCents,
  toQtyE4,
} from "@/lib/money";

describe("money math (integer cents, E4 quantities)", () => {
  it("converts shares to E4 and back exactly", () => {
    expect(toQtyE4(1)).toBe(10_000);
    expect(toQtyE4(0.0001)).toBe(1);
    expect(toQtyE4(2.5)).toBe(25_000);
    expect(qtyE4ToShares(15_000)).toBe(1.5);
  });

  it("rounds dollar inputs to cents, never truncates", () => {
    expect(toCents(10.005)).toBe(1001);
    expect(toCents(199.999)).toBe(20_000);
  });

  it("computes notional cost with correct rounding", () => {
    // 1.5 shares @ $123.45 = $185.175 → 18518 cents (round half up)
    expect(notionalCents(12_345, 15_000)).toBe(18_518);
    // whole shares stay exact
    expect(notionalCents(10_000, 40 * 10_000)).toBe(400_000);
  });

  it("rejects unsafe magnitudes instead of silently losing precision", () => {
    expect(() => notionalCents(Number.MAX_SAFE_INTEGER, 10_000)).toThrow();
  });

  it("computes volume-weighted average cost", () => {
    // 10 shares @ $100, add 10 @ $200 → avg $150
    expect(averageCostCents(100_000, 10_000, 100_000, 20_000)).toBe(15_000);
    // fractional: 1 @ $100 + 3 @ $50 → $62.50
    expect(averageCostCents(10_000, 10_000, 30_000, 5_000)).toBe(6_250);
  });

  it("realized P/L is proceeds minus cost at avg basis", () => {
    // sell 2 shares @ $110 bought at $100 → +$20
    expect(realizedPnlCents(20_000, 11_000, 10_000)).toBe(2_000);
    // losses are negative
    expect(realizedPnlCents(10_000, 9_000, 10_000)).toBe(-1_000);
  });

  it("formats without feeding presentation back into math", () => {
    expect(fmtCents(123_456)).toBe("$1,234.56");
    expect(fmtCents(50, { signed: true })).toBe("+$0.50");
  });
});
