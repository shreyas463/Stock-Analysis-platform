import { fmtCents } from "@/lib/money";

export type AlertKind =
  | "price_above"
  | "price_below"
  | "pct_move"
  | "volume_spike"
  | "rsi_above"
  | "rsi_below"
  | "ma_cross"
  | "drawdown";

export type AlertRow = {
  id: string;
  userId: string;
  symbol: string | null;
  kind: AlertKind;
  threshold: number | null;
  params: Record<string, unknown> | null;
  enabled: boolean;
  lastTriggeredAt: number | null;
  createdAt: number;
  currentReading: number | null;
};

export type AlertsResponse = { alerts: AlertRow[] };

/**
 * Everything the UI needs to know about a kind: plain-language label, the
 * threshold's unit/adornment, input→server conversion, and validation that
 * mirrors the server exactly.
 */
export type KindMeta = {
  label: string;
  unit: "$" | "%" | "RSI" | "×" | null;
  inputHint: string;
  /** Convert the user's input to the stored integer threshold. */
  toThreshold: (input: number) => number;
  /** Convert a stored threshold back to input units (for display). */
  fromThreshold: (threshold: number) => number;
  /** Mirror of the server's per-kind range check. Returns an error or null. */
  validate: (input: number) => string | null;
};

export const KIND_META: Record<AlertKind, KindMeta> = {
  price_above: {
    label: "Price rises above",
    unit: "$",
    inputHint: "e.g. 250.00",
    toThreshold: (d) => Math.round(d * 100),
    fromThreshold: (t) => t / 100,
    validate: (d) =>
      d >= 0.01 && d <= 1_000_000 ? null : "Enter a price between $0.01 and $1,000,000",
  },
  price_below: {
    label: "Price falls below",
    unit: "$",
    inputHint: "e.g. 120.00",
    toThreshold: (d) => Math.round(d * 100),
    fromThreshold: (t) => t / 100,
    validate: (d) =>
      d >= 0.01 && d <= 1_000_000 ? null : "Enter a price between $0.01 and $1,000,000",
  },
  pct_move: {
    label: "Daily move exceeds",
    unit: "%",
    inputHint: "e.g. 5",
    toThreshold: (p) => Math.round(p * 100),
    fromThreshold: (t) => t / 100,
    validate: (p) => (p >= 0.1 && p <= 100 ? null : "Enter a move between 0.1% and 100%"),
  },
  volume_spike: {
    label: "Volume spikes to",
    unit: "×",
    inputHint: "e.g. 2 for 2× average",
    toThreshold: (x) => Math.round(x * 100),
    fromThreshold: (t) => t / 100,
    validate: (x) => (x >= 1.1 && x <= 100 ? null : "Enter a multiplier between 1.1× and 100×"),
  },
  rsi_above: {
    label: "RSI(14) rises above",
    unit: "RSI",
    inputHint: "e.g. 70",
    toThreshold: (r) => Math.round(r),
    fromThreshold: (t) => t,
    validate: (r) =>
      Number.isInteger(r) && r >= 1 && r <= 99 ? null : "Enter an RSI level from 1 to 99",
  },
  rsi_below: {
    label: "RSI(14) falls below",
    unit: "RSI",
    inputHint: "e.g. 30",
    toThreshold: (r) => Math.round(r),
    fromThreshold: (t) => t,
    validate: (r) =>
      Number.isInteger(r) && r >= 1 && r <= 99 ? null : "Enter an RSI level from 1 to 99",
  },
  ma_cross: {
    label: "50/200-day MA cross",
    unit: null,
    inputHint: "",
    toThreshold: () => 0,
    fromThreshold: () => 0,
    validate: () => null,
  },
  drawdown: {
    label: "Falls from 52-week high by",
    unit: "%",
    inputHint: "e.g. 20",
    toThreshold: (p) => Math.round(p * 100),
    fromThreshold: (t) => t / 100,
    validate: (p) => (p >= 1 && p <= 99 ? null : "Enter a drawdown between 1% and 99%"),
  },
};

export const KIND_ORDER: AlertKind[] = [
  "price_above",
  "price_below",
  "pct_move",
  "volume_spike",
  "rsi_above",
  "rsi_below",
  "ma_cross",
  "drawdown",
];

function pct(threshold: number): string {
  const v = threshold / 100;
  return `${Number.isInteger(v) ? v : v.toFixed(1)}%`;
}

/** Declarative condition sentence for the rules table. */
export function conditionSentence(kind: AlertKind, threshold: number | null): string {
  switch (kind) {
    case "price_above":
      return threshold === null ? "Price above —" : `Price above ${fmtCents(threshold)}`;
    case "price_below":
      return threshold === null ? "Price below —" : `Price below ${fmtCents(threshold)}`;
    case "pct_move":
      return threshold === null ? "Daily move" : `Moves more than ${pct(threshold)} in a day`;
    case "volume_spike":
      return `Volume ≥ ${((threshold ?? 200) / 100).toFixed(1)}× its 20-day average`;
    case "rsi_above":
      return `RSI(14) above ${threshold ?? "—"}`;
    case "rsi_below":
      return `RSI(14) below ${threshold ?? "—"}`;
    case "ma_cross":
      return "50-day MA crosses 200-day MA";
    case "drawdown":
      return threshold === null ? "Drawdown" : `Falls ${pct(threshold)} from 52-week high`;
  }
}

/** First-person preview sentence for the create dialog. */
export function previewSentence(
  symbol: string | null,
  kind: AlertKind,
  threshold: number | null,
): string | null {
  const sym = symbol ?? "…";
  switch (kind) {
    case "price_above":
      return threshold === null
        ? null
        : `Notify me when ${sym} rises above ${fmtCents(threshold)}.`;
    case "price_below":
      return threshold === null
        ? null
        : `Notify me when ${sym} falls below ${fmtCents(threshold)}.`;
    case "pct_move":
      return threshold === null
        ? null
        : `Notify me when ${sym} moves more than ${pct(threshold)} in a day.`;
    case "volume_spike":
      return threshold === null
        ? null
        : `Notify me when ${sym} trades at ${(threshold / 100).toFixed(1)}× its 20-day average volume.`;
    case "rsi_above":
      return threshold === null
        ? null
        : `Notify me when ${sym}'s RSI(14) rises above ${threshold}.`;
    case "rsi_below":
      return threshold === null
        ? null
        : `Notify me when ${sym}'s RSI(14) falls below ${threshold}.`;
    case "ma_cross":
      return `Notify me when ${sym}'s 50-day MA crosses its 200-day MA.`;
    case "drawdown":
      return threshold === null
        ? null
        : `Notify me when ${sym} falls ${pct(threshold)} from its 52-week high.`;
  }
}
