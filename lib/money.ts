/**
 * Financial arithmetic on integers only.
 * - Money: integer cents.
 * - Quantities: integer ten-thousandths of a share ("E4"), so 1.5 shares = 15000.
 * Formatting helpers are presentation-only and never feed back into math.
 */

export const QTY_SCALE = 10_000;

export function toQtyE4(shares: number): number {
  if (!Number.isFinite(shares)) throw new Error("Invalid share quantity");
  return Math.round(shares * QTY_SCALE);
}

export function qtyE4ToShares(qtyE4: number): number {
  return qtyE4 / QTY_SCALE;
}

export function toCents(dollars: number): number {
  if (!Number.isFinite(dollars)) throw new Error("Invalid dollar amount");
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

/** Cost of qtyE4 shares at priceCents per share, rounded to the nearest cent. */
export function notionalCents(priceCents: number, qtyE4: number): number {
  // priceCents * qtyE4 can exceed 2^53 only above ~$9e11 per position; guard anyway.
  const product = priceCents * qtyE4;
  if (!Number.isSafeInteger(product)) throw new Error("Position value overflow");
  return Math.round(product / QTY_SCALE);
}

/** Volume-weighted average cost in cents when adding to a position. */
export function averageCostCents(
  existingQtyE4: number,
  existingAvgCents: number,
  addQtyE4: number,
  addPriceCents: number,
): number {
  const totalQty = existingQtyE4 + addQtyE4;
  if (totalQty <= 0) throw new Error("Average cost requires positive quantity");
  const totalCost = existingQtyE4 * existingAvgCents + addQtyE4 * addPriceCents;
  return Math.round(totalCost / totalQty);
}

/** Realized P/L in cents for selling qtyE4 at priceCents against avgCostCents. */
export function realizedPnlCents(
  qtyE4: number,
  sellPriceCents: number,
  avgCostCents: number,
): number {
  return notionalCents(sellPriceCents, qtyE4) - notionalCents(avgCostCents, qtyE4);
}

// ── formatting (presentation only) ──────────────────────────────────

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const usdPrecise = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

export function fmtCents(cents: number, opts?: { precise?: boolean; signed?: boolean }): string {
  const value = cents / 100;
  const text = (opts?.precise ? usdPrecise : usd).format(value);
  if (opts?.signed && cents > 0) return `+${text}`;
  return text;
}

export function fmtQtyE4(qtyE4: number): string {
  const shares = qtyE4 / QTY_SCALE;
  return Number.isInteger(shares)
    ? shares.toLocaleString("en-US")
    : shares.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export function fmtPct(fraction: number, opts?: { signed?: boolean; digits?: number }): string {
  const digits = opts?.digits ?? 2;
  const text = `${(fraction * 100).toFixed(digits)}%`;
  if (opts?.signed && fraction > 0) return `+${text}`;
  return text;
}
