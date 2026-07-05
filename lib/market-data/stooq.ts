import { eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { env } from "@/lib/env";
import type { Candle } from "./types";
import { ProviderError } from "./types";

/**
 * Stooq provides free end-of-day OHLCV history for US tickers as CSV
 * (no API key). We fetch once per symbol per day and persist into the
 * SQLite `candles` table; everything downstream reads from the cache.
 */

const TIMEOUT_MS = 10_000;

function parseCsv(text: string): Candle[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2 || !lines[0]?.toLowerCase().startsWith("date")) return [];
  const out: Candle[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i]!.split(",");
    if (parts.length < 6) continue;
    const [date, open, high, low, close, volume] = parts;
    const o = Number(open);
    const h = Number(high);
    const l = Number(low);
    const c = Number(close);
    if (!date || !Number.isFinite(o) || !Number.isFinite(c) || c <= 0) continue;
    out.push({
      date,
      openCents: Math.round(o * 100),
      highCents: Math.round(h * 100),
      lowCents: Math.round(l * 100),
      closeCents: Math.round(c * 100),
      volume: Number.isFinite(Number(volume)) ? Math.round(Number(volume)) : 0,
    });
  }
  return out;
}

export async function fetchStooqDaily(symbol: string): Promise<Candle[]> {
  if (!env.STOOQ_ENABLED) {
    throw new ProviderError("Stooq disabled", "stooq", "disabled");
  }
  const sym = symbol.toLowerCase();
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(`${sym}.us`)}&i=d`;
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch (err) {
    throw new ProviderError(
      err instanceof Error ? err.message : "Stooq fetch failed",
      "stooq",
      "timeout",
    );
  }
  if (!res.ok) throw new ProviderError(`Stooq ${res.status}`, "stooq", "upstream");
  const text = await res.text();
  const candles = parseCsv(text);
  if (candles.length === 0) {
    throw new ProviderError(`No Stooq history for ${symbol}`, "stooq", "not_found");
  }
  return candles;
}

export function readCachedCandles(symbol: string): {
  candles: Candle[];
  source: "stooq" | "synthetic";
  fetchedAt: number;
} | null {
  const sym = symbol.toUpperCase();
  const meta = db
    .select()
    .from(tables.candleMeta)
    .where(eq(tables.candleMeta.symbol, sym))
    .limit(1)
    .all()[0];
  if (!meta) return null;
  const rows = db.select().from(tables.candles).where(eq(tables.candles.symbol, sym)).all();
  rows.sort((a, b) => (a.date < b.date ? -1 : 1));
  return {
    candles: rows.map((r) => ({
      date: r.date,
      openCents: r.openCents,
      highCents: r.highCents,
      lowCents: r.lowCents,
      closeCents: r.closeCents,
      volume: r.volume,
    })),
    source: meta.source,
    fetchedAt: meta.fetchedAt,
  };
}

export function writeCandleCache(
  symbol: string,
  candles: Candle[],
  source: "stooq" | "synthetic",
): void {
  if (candles.length === 0) return;
  const sym = symbol.toUpperCase();
  const first = candles[0]!;
  const last = candles[candles.length - 1]!;

  db.transaction((tx) => {
    tx.delete(tables.candles).where(eq(tables.candles.symbol, sym)).run();
    // SQLite parameter limit: insert in chunks.
    for (let i = 0; i < candles.length; i += 500) {
      tx.insert(tables.candles)
        .values(
          candles.slice(i, i + 500).map((c) => ({
            symbol: sym,
            date: c.date,
            openCents: c.openCents,
            highCents: c.highCents,
            lowCents: c.lowCents,
            closeCents: c.closeCents,
            volume: c.volume,
            source,
          })),
        )
        .run();
    }
    tx.insert(tables.candleMeta)
      .values({
        symbol: sym,
        source,
        firstDate: first.date,
        lastDate: last.date,
        fetchedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: tables.candleMeta.symbol,
        set: { source, firstDate: first.date, lastDate: last.date, fetchedAt: Date.now() },
      })
      .run();
  });
}
