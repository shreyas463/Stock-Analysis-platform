/**
 * Market-data provider abstraction.
 *
 * Every response is tagged with its source and timestamp. Synthetic data is
 * only ever produced by the demo provider and is always labeled — a live
 * provider failure surfaces as an error or stale flag, never as invented data.
 */

export type DataSource = "finnhub" | "stooq" | "synthetic";

export type Quote = {
  symbol: string;
  priceCents: number;
  prevCloseCents: number;
  openCents: number | null;
  highCents: number | null;
  lowCents: number | null;
  changeCents: number;
  changePct: number; // fraction, e.g. 0.0123
  asOf: number; // unix ms
  source: DataSource;
  synthetic: boolean;
  stale: boolean;
};

export type Candle = {
  date: string; // YYYY-MM-DD
  openCents: number;
  highCents: number;
  lowCents: number;
  closeCents: number;
  volume: number;
};

export type CandleSeries = {
  symbol: string;
  candles: Candle[];
  source: DataSource;
  synthetic: boolean;
  asOf: number;
};

export type CompanyProfile = {
  symbol: string;
  name: string;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  marketCapCents: number | null;
  sharesOutstanding: number | null;
  ipoDate: string | null;
  website: string | null;
  logoUrl: string | null;
  description: string | null;
  source: DataSource;
  synthetic: boolean;
};

export type Fundamentals = {
  symbol: string;
  peRatio: number | null;
  psRatio: number | null;
  pbRatio: number | null;
  epsTtm: number | null;
  revenueGrowthYoY: number | null;
  epsGrowthYoY: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  roe: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;
  beta: number | null;
  high52wCents: number | null;
  low52wCents: number | null;
  asOf: number;
  source: DataSource;
  synthetic: boolean;
};

export type NewsItem = {
  id: string;
  headline: string;
  summary: string | null;
  source: string;
  url: string;
  imageUrl: string | null;
  publishedAt: number; // unix ms
  symbols: string[];
};

export type SearchResult = {
  symbol: string;
  name: string;
  exchange: string | null;
  type: string;
};

export type MarketStatus = {
  open: boolean;
  session: "pre" | "regular" | "after" | "closed";
  nextChangeAt: number | null;
  asOf: number;
};

export type MoverEntry = {
  symbol: string;
  name: string;
  priceCents: number;
  changePct: number;
  synthetic: boolean;
};

export interface MarketDataProvider {
  readonly name: DataSource;
  getQuote(symbol: string): Promise<Quote>;
  search(query: string): Promise<SearchResult[]>;
  getProfile(symbol: string): Promise<CompanyProfile | null>;
  getFundamentals(symbol: string): Promise<Fundamentals | null>;
  getNews(symbol: string | null, limit: number): Promise<NewsItem[]>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly kind: "rate_limited" | "timeout" | "not_found" | "upstream" | "disabled",
  ) {
    super(message);
  }
}
