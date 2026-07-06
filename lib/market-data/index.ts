import { env } from "@/lib/env";
import { finnhubProvider } from "./finnhub";
import { fetchStooqDaily, readCachedCandles, writeCandleCache } from "./stooq";
import {
  lastTradingDayStr,
  syntheticProvider,
  syntheticSeries,
  SYNTHETIC_EPOCH,
} from "./synthetic";
import type {
  CandleSeries,
  CompanyProfile,
  Fundamentals,
  MarketStatus,
  MoverEntry,
  NewsItem,
  Quote,
  SearchResult,
} from "./types";
import { ProviderError } from "./types";
import { UNIVERSE } from "./universe";

export * from "./types";
export { UNIVERSE, UNIVERSE_BY_SYMBOL } from "./universe";
export { SYNTHETIC_EPOCH };

/**
 * Composite market-data service. All app code goes through this module —
 * nothing else talks to providers directly, and provider keys never reach
 * the client. Demo mode (no FINNHUB_API_KEY) serves deterministic synthetic
 * data, always labeled as such.
 */

// ── tiny TTL cache ──────────────────────────────────────────────────

const memCache = new Map<string, { value: unknown; expiresAt: number }>();
const inflight = new Map<string, Promise<unknown>>();

async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = memCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  const promise = fn()
    .then((value) => {
      memCache.set(key, { value, expiresAt: Date.now() + ttlMs });
      // Bound the cache: evict expired entries opportunistically.
      if (memCache.size > 2000) {
        const now = Date.now();
        for (const [k, v] of memCache) if (v.expiresAt < now) memCache.delete(k);
      }
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export function isDemoMode(): boolean {
  return env.isDemoMode;
}

const VALID_SYMBOL = /^[A-Z][A-Z0-9.\-]{0,9}$/;

export function normalizeSymbol(raw: string): string {
  const sym = raw.trim().toUpperCase();
  if (!VALID_SYMBOL.test(sym))
    throw new ProviderError(`Invalid symbol: ${raw}`, "basis", "not_found");
  return sym;
}

// ── quotes ──────────────────────────────────────────────────────────

export async function getQuote(rawSymbol: string): Promise<Quote> {
  const symbol = normalizeSymbol(rawSymbol);
  return cached(`quote:${symbol}`, 15_000, async () => {
    if (env.isDemoMode) return syntheticProvider.getQuote(symbol);
    try {
      return await finnhubProvider.getQuote(symbol);
    } catch (err) {
      // Degrade to the most recent cached daily close, clearly marked stale.
      const cachedCandles = readCachedCandles(symbol);
      const last = cachedCandles?.candles[cachedCandles.candles.length - 1];
      const prev = cachedCandles?.candles[cachedCandles.candles.length - 2];
      if (cachedCandles && last && cachedCandles.source === "stooq") {
        const prevClose = prev?.closeCents ?? last.openCents;
        return {
          symbol,
          priceCents: last.closeCents,
          prevCloseCents: prevClose,
          openCents: last.openCents,
          highCents: last.highCents,
          lowCents: last.lowCents,
          changeCents: last.closeCents - prevClose,
          changePct: prevClose > 0 ? (last.closeCents - prevClose) / prevClose : 0,
          asOf: new Date(`${last.date}T21:00:00Z`).getTime(),
          source: "stooq",
          synthetic: false,
          stale: true,
        } satisfies Quote;
      }
      throw err;
    }
  });
}

export async function getQuotes(symbols: string[]): Promise<Map<string, Quote>> {
  const unique = [...new Set(symbols.map(normalizeSymbol))];
  const out = new Map<string, Quote>();
  const results = await Promise.allSettled(unique.map((s) => getQuote(s)));
  results.forEach((r, i) => {
    if (r.status === "fulfilled") out.set(unique[i]!, r.value);
  });
  return out;
}

// ── daily candles ───────────────────────────────────────────────────

const CANDLE_REFRESH_MS = 12 * 3600 * 1000;

export async function getDailyCandles(
  rawSymbol: string,
  opts?: { from?: string; to?: string },
): Promise<CandleSeries> {
  const symbol = normalizeSymbol(rawSymbol);
  const from = opts?.from ?? SYNTHETIC_EPOCH;
  const to = opts?.to ?? lastTradingDayStr();

  if (env.isDemoMode) {
    const all = syntheticSeries(symbol, lastTradingDayStr());
    return {
      symbol,
      candles: all.filter((c) => c.date >= from && c.date <= to),
      source: "synthetic",
      synthetic: true,
      asOf: Date.now(),
    };
  }

  const cachedSeries = readCachedCandles(symbol);
  const fresh = cachedSeries && Date.now() - cachedSeries.fetchedAt < CANDLE_REFRESH_MS;

  if (!fresh) {
    try {
      const candles = await cached(`stooq:${symbol}`, CANDLE_REFRESH_MS, () =>
        fetchStooqDaily(symbol),
      );
      writeCandleCache(symbol, candles, "stooq");
      return {
        symbol,
        candles: candles.filter((c) => c.date >= from && c.date <= to),
        source: "stooq",
        synthetic: false,
        asOf: Date.now(),
      };
    } catch (err) {
      if (!cachedSeries) throw err; // no data at all — surface the failure honestly
    }
  }

  return {
    symbol,
    candles: cachedSeries!.candles.filter((c) => c.date >= from && c.date <= to),
    source: cachedSeries!.source,
    synthetic: cachedSeries!.source === "synthetic",
    asOf: cachedSeries!.fetchedAt,
  };
}

// ── search / profile / fundamentals / news ──────────────────────────

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  return cached(`search:${q.toLowerCase()}`, 60_000, async () => {
    if (env.isDemoMode) return syntheticProvider.search(q);
    try {
      return await finnhubProvider.search(q);
    } catch {
      // Search degradation: fall back to the static universe list (real names).
      return syntheticProvider.search(q);
    }
  });
}

export async function getProfile(rawSymbol: string): Promise<CompanyProfile | null> {
  const symbol = normalizeSymbol(rawSymbol);
  return cached(`profile:${symbol}`, 3600_000, async () => {
    if (env.isDemoMode) return syntheticProvider.getProfile(symbol);
    try {
      return await finnhubProvider.getProfile(symbol);
    } catch {
      return null;
    }
  });
}

export async function getFundamentals(rawSymbol: string): Promise<Fundamentals | null> {
  const symbol = normalizeSymbol(rawSymbol);
  return cached(`fund:${symbol}`, 3600_000, async () => {
    if (env.isDemoMode) return syntheticProvider.getFundamentals(symbol);
    try {
      return await finnhubProvider.getFundamentals(symbol);
    } catch {
      return null;
    }
  });
}

export async function getNews(symbol: string | null, limit = 20): Promise<NewsItem[]> {
  const key = `news:${symbol ?? "general"}:${limit}`;
  return cached(key, 5 * 60_000, async () => {
    if (env.isDemoMode) return [];
    try {
      return await finnhubProvider.getNews(symbol ? normalizeSymbol(symbol) : null, limit);
    } catch {
      return [];
    }
  });
}

// ── market status & movers ──────────────────────────────────────────

/** US equity market hours in America/New_York, weekends only (no holiday calendar). */
export function getMarketStatus(now = new Date()): MarketStatus {
  const et = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => et.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday");
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  const isWeekend = weekday === "Sat" || weekday === "Sun";

  let session: MarketStatus["session"] = "closed";
  if (!isWeekend) {
    if (minutes >= 4 * 60 && minutes < 9 * 60 + 30) session = "pre";
    else if (minutes >= 9 * 60 + 30 && minutes < 16 * 60) session = "regular";
    else if (minutes >= 16 * 60 && minutes < 20 * 60) session = "after";
  }
  return { open: session === "regular", session, nextChangeAt: null, asOf: now.getTime() };
}

export async function getMovers(): Promise<{ gainers: MoverEntry[]; losers: MoverEntry[] }> {
  const symbols = UNIVERSE.filter((u) => !u.etf)
    .slice(0, 30)
    .map((u) => u.symbol);
  const quotes = await getQuotes(symbols);
  const entries: MoverEntry[] = [];
  for (const u of UNIVERSE) {
    const q = quotes.get(u.symbol);
    if (!q) continue;
    entries.push({
      symbol: u.symbol,
      name: u.name,
      priceCents: q.priceCents,
      changePct: q.changePct,
      synthetic: q.synthetic,
    });
  }
  const sorted = [...entries].sort((a, b) => b.changePct - a.changePct);
  return { gainers: sorted.slice(0, 6), losers: sorted.slice(-6).reverse() };
}
