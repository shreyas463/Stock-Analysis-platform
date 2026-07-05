/**
 * Type-only module shared by the markets route handlers (server) and the
 * markets client components.
 */

export type UniverseStatic = {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  exchange: string;
  etf: boolean;
};

export type UniverseQuoteLite = {
  priceCents: number;
  changeCents: number;
  changePct: number; // fraction
  synthetic: boolean;
  stale: boolean;
  asOf: number;
};

export type UniverseRow = UniverseStatic & { quote: UniverseQuoteLite | null };

export type UniversePayload = {
  rows: UniverseRow[];
  demoMode: boolean;
  asOf: number;
};

export type MoverLite = {
  symbol: string;
  name: string;
  priceCents: number;
  changePct: number;
  synthetic: boolean;
};

export type MoversPayload = {
  gainers: MoverLite[];
  losers: MoverLite[];
  demoMode: boolean;
  asOf: number;
};

export type MarketStatusPayload = {
  open: boolean;
  session: "pre" | "regular" | "after" | "closed";
  nextChangeAt: number | null;
  asOf: number;
  demoMode: boolean;
};

export type CandlesPayload = {
  symbol?: string;
  candles?: { date: string; closeCents: number }[];
  synthetic?: boolean;
  source?: string;
};
