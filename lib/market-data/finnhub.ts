import { env } from "@/lib/env";
import type {
  CompanyProfile,
  Fundamentals,
  MarketDataProvider,
  NewsItem,
  Quote,
  SearchResult,
} from "./types";
import { ProviderError } from "./types";

const BASE = "https://finnhub.io/api/v1";
const TIMEOUT_MS = 8_000;
const MAX_RETRIES = 2;

/** Simple token bucket: Finnhub free tier allows 60 calls/min. */
const bucket = { tokens: 50, lastRefill: Date.now() };
function takeToken(): boolean {
  const now = Date.now();
  const elapsed = now - bucket.lastRefill;
  bucket.tokens = Math.min(50, bucket.tokens + (elapsed / 60_000) * 50);
  bucket.lastRefill = now;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

async function finnhubGet<T>(path: string, params: Record<string, string>): Promise<T> {
  if (!env.FINNHUB_API_KEY) {
    throw new ProviderError("Finnhub not configured", "finnhub", "disabled");
  }
  if (!takeToken()) {
    throw new ProviderError("Finnhub rate limit reached", "finnhub", "rate_limited");
  }

  const search = new URLSearchParams({ ...params, token: env.FINNHUB_API_KEY });
  const url = `${BASE}${path}?${search}`;

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      if (res.status === 429) {
        throw new ProviderError("Finnhub 429", "finnhub", "rate_limited");
      }
      if (!res.ok) {
        throw new ProviderError(`Finnhub ${res.status}`, "finnhub", "upstream");
      }
      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
      if (err instanceof ProviderError && err.kind === "rate_limited") throw err;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
    }
  }
  if (lastError instanceof ProviderError) throw lastError;
  throw new ProviderError(
    lastError instanceof Error ? lastError.message : "Finnhub request failed",
    "finnhub",
    "timeout",
  );
}

type FinnhubQuote = {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
};

export class FinnhubProvider implements MarketDataProvider {
  readonly name = "finnhub" as const;

  async getQuote(symbol: string): Promise<Quote> {
    const sym = symbol.toUpperCase();
    const q = await finnhubGet<FinnhubQuote>("/quote", { symbol: sym });
    if (!q || typeof q.c !== "number" || q.c <= 0) {
      throw new ProviderError(`No quote for ${sym}`, "finnhub", "not_found");
    }
    const priceCents = Math.round(q.c * 100);
    const prevCloseCents = Math.round((q.pc || q.c) * 100);
    return {
      symbol: sym,
      priceCents,
      prevCloseCents,
      openCents: q.o ? Math.round(q.o * 100) : null,
      highCents: q.h ? Math.round(q.h * 100) : null,
      lowCents: q.l ? Math.round(q.l * 100) : null,
      changeCents: priceCents - prevCloseCents,
      changePct: prevCloseCents > 0 ? (priceCents - prevCloseCents) / prevCloseCents : 0,
      asOf: q.t ? q.t * 1000 : Date.now(),
      source: "finnhub",
      synthetic: false,
      stale: false,
    };
  }

  async search(query: string): Promise<SearchResult[]> {
    const data = await finnhubGet<{ result?: Array<Record<string, string>> }>("/search", {
      q: query,
      exchange: "US",
    });
    return (data.result ?? [])
      .filter((r) => r.symbol && !r.symbol.includes(".") && r.type === "Common Stock")
      .slice(0, 10)
      .map((r) => ({
        symbol: r.symbol!,
        name: r.description ?? r.symbol!,
        exchange: null,
        type: r.type ?? "Common Stock",
      }));
  }

  async getProfile(symbol: string): Promise<CompanyProfile | null> {
    const sym = symbol.toUpperCase();
    const p = await finnhubGet<Record<string, unknown>>("/stock/profile2", { symbol: sym });
    if (!p || !p.name) return null;
    const marketCapM = typeof p.marketCapitalization === "number" ? p.marketCapitalization : null;
    return {
      symbol: sym,
      name: String(p.name),
      exchange: p.exchange ? String(p.exchange) : null,
      sector: p.finnhubIndustry ? String(p.finnhubIndustry) : null,
      industry: p.finnhubIndustry ? String(p.finnhubIndustry) : null,
      marketCapCents: marketCapM ? Math.round(marketCapM * 1_000_000 * 100) : null,
      sharesOutstanding:
        typeof p.shareOutstanding === "number" ? p.shareOutstanding * 1_000_000 : null,
      ipoDate: p.ipo ? String(p.ipo) : null,
      website: p.weburl ? String(p.weburl) : null,
      logoUrl: p.logo ? String(p.logo) : null,
      description: null,
      source: "finnhub",
      synthetic: false,
    };
  }

  async getFundamentals(symbol: string): Promise<Fundamentals | null> {
    const sym = symbol.toUpperCase();
    const data = await finnhubGet<{ metric?: Record<string, number | null> }>("/stock/metric", {
      symbol: sym,
      metric: "all",
    });
    const m = data.metric;
    if (!m) return null;
    const num = (k: string): number | null => {
      const v = m[k];
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    };
    const pct = (k: string): number | null => {
      const v = num(k);
      return v === null ? null : v / 100;
    };
    return {
      symbol: sym,
      peRatio: num("peTTM") ?? num("peBasicExclExtraTTM"),
      psRatio: num("psTTM"),
      pbRatio: num("pb"),
      epsTtm: num("epsTTM"),
      revenueGrowthYoY: pct("revenueGrowthTTMYoy"),
      epsGrowthYoY: pct("epsGrowthTTMYoy"),
      grossMargin: pct("grossMarginTTM"),
      operatingMargin: pct("operatingMarginTTM"),
      netMargin: pct("netProfitMarginTTM"),
      roe: pct("roeTTM"),
      debtToEquity: num("totalDebt/totalEquityQuarterly"),
      currentRatio: num("currentRatioQuarterly"),
      dividendYield: pct("currentDividendYieldTTM"),
      payoutRatio: pct("payoutRatioTTM"),
      beta: num("beta"),
      high52wCents: num("52WeekHigh") ? Math.round(num("52WeekHigh")! * 100) : null,
      low52wCents: num("52WeekLow") ? Math.round(num("52WeekLow")! * 100) : null,
      asOf: Date.now(),
      source: "finnhub",
      synthetic: false,
    };
  }

  async getNews(symbol: string | null, limit: number): Promise<NewsItem[]> {
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 24 * 3600 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    type RawNews = {
      id: number;
      headline: string;
      summary: string;
      source: string;
      url: string;
      image: string;
      datetime: number;
      related: string;
      category: string;
    };

    const items = symbol
      ? await finnhubGet<RawNews[]>("/company-news", {
          symbol: symbol.toUpperCase(),
          from: fmt(from),
          to: fmt(to),
        })
      : await finnhubGet<RawNews[]>("/news", { category: "general" });

    return (items ?? [])
      .filter((n) => n.headline && n.url)
      .slice(0, limit)
      .map((n) => ({
        id: String(n.id),
        headline: n.headline,
        summary: n.summary || null,
        source: n.source || "Unknown",
        url: n.url,
        imageUrl: n.image || null,
        publishedAt: n.datetime * 1000,
        symbols: symbol ? [symbol.toUpperCase()] : n.related ? n.related.split(",") : [],
      }));
  }
}

export const finnhubProvider = new FinnhubProvider();
