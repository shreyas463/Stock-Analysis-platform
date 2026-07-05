import type {
  Candle,
  CandleSeries,
  CompanyProfile,
  Fundamentals,
  MarketDataProvider,
  NewsItem,
  Quote,
  SearchResult,
} from "./types";
import { UNIVERSE, UNIVERSE_BY_SYMBOL } from "./universe";

/**
 * Deterministic synthetic market data for demo mode and tests.
 *
 * Series are generated with a seeded geometric-Brownian walk from a fixed
 * epoch, so the same symbol always produces the same history on every
 * machine. Everything returned here is flagged `synthetic: true` and the UI
 * renders a persistent demo-mode banner. News is NEVER fabricated — demo
 * mode simply has no news.
 */

export const SYNTHETIC_EPOCH = "2018-01-02";

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

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

function gaussianPair(rand: () => number): [number, number] {
  const u1 = Math.max(rand(), 1e-12);
  const u2 = rand();
  const r = Math.sqrt(-2 * Math.log(u1));
  return [r * Math.cos(2 * Math.PI * u2), r * Math.sin(2 * Math.PI * u2)];
}

export function isTradingDay(d: Date): boolean {
  const day = d.getUTCDay();
  return day !== 0 && day !== 6;
}

export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** All weekday dates from epoch through `until` (inclusive), YYYY-MM-DD. */
export function tradingDays(until: string, from: string = SYNTHETIC_EPOCH): string[] {
  const out: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${until}T00:00:00Z`);
  while (cursor <= end) {
    if (isTradingDay(cursor)) out.push(toDateStr(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

const seriesCache = new Map<string, { until: string; candles: Candle[] }>();

/** Deterministic daily series for a symbol from the epoch through `until`. */
export function syntheticSeries(symbol: string, until: string): Candle[] {
  const sym = symbol.toUpperCase();
  const cached = seriesCache.get(sym);
  if (cached && cached.until === until) return cached.candles;

  const entry = UNIVERSE_BY_SYMBOL.get(sym);
  const basePriceCents = entry?.basePriceCents ?? 5000;
  const drift = entry?.drift ?? 0.07;
  const vol = entry?.vol ?? 0.3;

  const days = tradingDays(until);
  const rand = mulberry32(hashSeed(`basis:${sym}`));
  const dt = 1 / 252;
  const mu = (drift - (vol * vol) / 2) * dt;
  const sigma = vol * Math.sqrt(dt);

  const candles: Candle[] = [];
  let close = basePriceCents;
  for (const date of days) {
    const [z1, z2] = gaussianPair(rand);
    const ret = mu + sigma * z1;
    const open = Math.max(1, Math.round(close * (1 + (sigma / 2) * z2 * 0.5)));
    const next = Math.max(1, Math.round(close * Math.exp(ret)));
    const intradayRange = Math.abs(z2) * sigma * close * 0.8 + close * 0.002;
    const high = Math.round(Math.max(open, next) + intradayRange / 2);
    const low = Math.max(1, Math.round(Math.min(open, next) - intradayRange / 2));
    const volume = Math.round(2_000_000 + rand() * 18_000_000 * (1 + Math.abs(z1)));
    candles.push({
      date,
      openCents: open,
      highCents: high,
      lowCents: low,
      closeCents: next,
      volume,
    });
    close = next;
  }

  seriesCache.set(sym, { until, candles });
  return candles;
}

export function lastTradingDayStr(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  while (!isTradingDay(d)) d.setUTCDate(d.getUTCDate() - 1);
  return toDateStr(d);
}

export class SyntheticProvider implements MarketDataProvider {
  readonly name = "synthetic" as const;

  async getQuote(symbol: string): Promise<Quote> {
    const sym = symbol.toUpperCase();
    const today = lastTradingDayStr();
    const series = syntheticSeries(sym, today);
    const last = series[series.length - 1];
    const prev = series[series.length - 2];
    if (!last || !prev) throw new Error(`No synthetic series for ${sym}`);

    // Small deterministic intraday move keyed to the current hour so the demo
    // feels alive without ever pretending to be live data.
    const now = new Date();
    const wiggleSeed = hashSeed(
      `${sym}:${today}:${now.getUTCHours()}:${Math.floor(now.getUTCMinutes() / 15)}`,
    );
    const wiggle = (mulberry32(wiggleSeed)() - 0.5) * 0.01;
    const priceCents = Math.max(1, Math.round(last.closeCents * (1 + wiggle)));

    return {
      symbol: sym,
      priceCents,
      prevCloseCents: prev.closeCents,
      openCents: last.openCents,
      highCents: Math.max(last.highCents, priceCents),
      lowCents: Math.min(last.lowCents, priceCents),
      changeCents: priceCents - prev.closeCents,
      changePct: (priceCents - prev.closeCents) / prev.closeCents,
      asOf: Date.now(),
      source: "synthetic",
      synthetic: true,
      stale: false,
    };
  }

  getCandles(symbol: string, from: string, to: string): CandleSeries {
    const sym = symbol.toUpperCase();
    const all = syntheticSeries(sym, lastTradingDayStr());
    return {
      symbol: sym,
      candles: all.filter((c) => c.date >= from && c.date <= to),
      source: "synthetic",
      synthetic: true,
      asOf: Date.now(),
    };
  }

  async search(query: string): Promise<SearchResult[]> {
    const q = query.trim().toUpperCase();
    if (!q) return [];
    return UNIVERSE.filter((u) => u.symbol.startsWith(q) || u.name.toUpperCase().includes(q))
      .slice(0, 10)
      .map((u) => ({
        symbol: u.symbol,
        name: u.name,
        exchange: u.exchange,
        type: u.etf ? "ETF" : "Common Stock",
      }));
  }

  async getProfile(symbol: string): Promise<CompanyProfile | null> {
    const u = UNIVERSE_BY_SYMBOL.get(symbol.toUpperCase());
    if (!u) return null;
    const quote = await this.getQuote(u.symbol);
    const shares = 1_000_000_000 + (hashSeed(u.symbol) % 15_000_000_000);
    return {
      symbol: u.symbol,
      name: u.name,
      exchange: u.exchange,
      sector: u.sector,
      industry: u.industry,
      marketCapCents: quote.priceCents * shares,
      sharesOutstanding: shares,
      ipoDate: null,
      website: null,
      logoUrl: null,
      description: `${u.name} — ${u.industry} (${u.sector}). Profile facts are static demo data; prices are synthetic.`,
      source: "synthetic",
      synthetic: true,
    };
  }

  async getFundamentals(symbol: string): Promise<Fundamentals | null> {
    const sym = symbol.toUpperCase();
    const u = UNIVERSE_BY_SYMBOL.get(sym);
    if (!u) return null;
    const rand = mulberry32(hashSeed(`fund:${sym}`));
    const quote = await this.getQuote(sym);
    const series = syntheticSeries(sym, lastTradingDayStr());
    const year = series.slice(-252);
    const high52w = Math.max(...year.map((c) => c.highCents));
    const low52w = Math.min(...year.map((c) => c.lowCents));

    // Deterministic pseudo-fundamentals shaped by sector character.
    const growthy = u.vol > 0.3;
    const eps = quote.priceCents / 100 / (12 + rand() * (growthy ? 45 : 15));
    return {
      symbol: sym,
      peRatio: quote.priceCents / 100 / eps,
      psRatio: growthy ? 4 + rand() * 8 : 1 + rand() * 3,
      pbRatio: 1.5 + rand() * (growthy ? 12 : 4),
      epsTtm: eps,
      revenueGrowthYoY: (growthy ? 0.08 : 0.01) + rand() * (growthy ? 0.25 : 0.08),
      epsGrowthYoY: (growthy ? 0.05 : -0.02) + rand() * (growthy ? 0.3 : 0.12),
      grossMargin: 0.3 + rand() * 0.45,
      operatingMargin: 0.08 + rand() * 0.3,
      netMargin: 0.05 + rand() * 0.25,
      roe: 0.08 + rand() * 0.3,
      debtToEquity: 0.2 + rand() * 1.5,
      currentRatio: 0.9 + rand() * 1.6,
      dividendYield: u.divYield,
      payoutRatio: u.divYield ? 0.15 + rand() * 0.5 : null,
      beta: u.vol / 0.18,
      high52wCents: high52w,
      low52wCents: low52w,
      asOf: Date.now(),
      source: "synthetic",
      synthetic: true,
    };
  }

  /** Demo mode has no news feed — we never fabricate headlines. */
  async getNews(_symbol: string | null, _limit: number): Promise<NewsItem[]> {
    return [];
  }
}

export const syntheticProvider = new SyntheticProvider();
