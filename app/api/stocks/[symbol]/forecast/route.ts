import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireUser, AuthError } from "@/lib/auth/session";
import { getDailyCandles, normalizeSymbol } from "@/lib/market-data";
import { ProviderError } from "@/lib/market-data/types";
import { computeForecast, ForecastError } from "@/lib/services/forecast";

/** In-memory result cache: forecasts are deterministic per (symbol, horizon, last candle). */
const cache = new Map<string, { key: string; value: unknown }>();

export async function GET(req: Request, { params }: { params: Promise<{ symbol: string }> }) {
  try {
    await requireUser();
    const { symbol: raw } = await params;
    const url = new URL(req.url);
    const horizon = Number(url.searchParams.get("horizon") ?? "21");
    if (![5, 10, 21].includes(horizon)) {
      return apiError(400, "invalid_request", "horizon must be 5, 10 or 21");
    }

    const symbol = normalizeSymbol(raw);
    const series = await getDailyCandles(symbol);
    const lastDate = series.candles[series.candles.length - 1]?.date ?? "none";

    const cacheKey = `${symbol}:${horizon}:${lastDate}:${series.source}`;
    const hit = cache.get(symbol + horizon);
    if (hit && hit.key === cacheKey) return NextResponse.json(hit.value);

    const result = computeForecast(
      series.candles.map((c) => ({ date: c.date, closeCents: c.closeCents })),
      horizon,
      { synthetic: series.synthetic },
    );

    const payload = {
      symbol,
      synthetic: series.synthetic,
      source: series.source,
      ...result,
    };
    cache.set(symbol + horizon, { key: cacheKey, value: payload });
    if (cache.size > 300) cache.clear();
    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof AuthError) return apiError(401, "unauthenticated", "Sign in required");
    if (err instanceof ForecastError) return apiError(422, "insufficient_history", err.message);
    if (err instanceof ProviderError) {
      return apiError(err.kind === "not_found" ? 404 : 502, `provider_${err.kind}`, err.message);
    }
    console.error("[forecast]", err);
    return apiError(500, "internal", "Forecast computation failed");
  }
}
