import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withUser } from "@/lib/api";
import { AuthError, requireUser } from "@/lib/auth/session";
import { db, tables } from "@/lib/db";
import { rsi } from "@/lib/analytics/indicators";
import { getDailyCandles, getQuotes, normalizeSymbol } from "@/lib/market-data";

type AlertRow = typeof tables.alerts.$inferSelect;
export type AlertKind = AlertRow["kind"];

export type AlertView = AlertRow & {
  /** Price cents for price-ish kinds, RSI value for rsi kinds; null when unavailable. */
  currentReading: number | null;
};

const PRICE_KINDS: AlertKind[] = ["price_above", "price_below", "pct_move", "drawdown"];
const RSI_KINDS: AlertKind[] = ["rsi_above", "rsi_below"];

export const GET = withUser(async (_req, { user }) => {
  const rows = db
    .select()
    .from(tables.alerts)
    .where(eq(tables.alerts.userId, user.id))
    .orderBy(desc(tables.alerts.createdAt))
    .all();

  // Batch quotes for the price-based kinds; RSI needs candles per symbol.
  const priceSymbols = rows
    .filter((r) => r.symbol && PRICE_KINDS.includes(r.kind))
    .map((r) => r.symbol!);
  const quotes = await getQuotes(priceSymbols).catch(() => new Map<string, never>());

  const rsiCache = new Map<string, number | null>();
  async function rsiFor(symbol: string): Promise<number | null> {
    const hit = rsiCache.get(symbol);
    if (hit !== undefined) return hit;
    let value: number | null = null;
    try {
      const series = await getDailyCandles(symbol);
      const values = rsi(
        series.candles.map((c) => c.closeCents),
        14,
      );
      const last = values[values.length - 1];
      value = last == null ? null : Math.round(last * 10) / 10;
    } catch {
      value = null;
    }
    rsiCache.set(symbol, value);
    return value;
  }

  const alerts: AlertView[] = [];
  for (const row of rows) {
    let currentReading: number | null = null;
    if (row.symbol && PRICE_KINDS.includes(row.kind)) {
      currentReading = quotes.get(row.symbol)?.priceCents ?? null;
    } else if (row.symbol && RSI_KINDS.includes(row.kind)) {
      currentReading = await rsiFor(row.symbol);
    }
    alerts.push({ ...row, currentReading });
  }

  return { alerts };
});

const baseSchema = z.object({
  symbol: z.string().min(1).max(10),
  kind: z.enum([
    "price_above",
    "price_below",
    "pct_move",
    "volume_spike",
    "rsi_above",
    "rsi_below",
    "ma_cross",
    "drawdown",
  ]),
  threshold: z.number().int().optional(),
});

/** Per-kind threshold semantics, mirrored by the client form. */
function validateThreshold(kind: AlertKind, threshold: number | undefined): string | null {
  switch (kind) {
    case "price_above":
    case "price_below":
      if (threshold === undefined || threshold < 1 || threshold > 100_000_000)
        return "Price alerts need a price between $0.01 and $1,000,000";
      return null;
    case "pct_move":
      if (threshold === undefined || threshold < 10 || threshold > 10_000)
        return "Daily move alerts need a threshold between 0.1% and 100%";
      return null;
    case "drawdown":
      if (threshold === undefined || threshold < 100 || threshold > 9_900)
        return "Drawdown alerts need a threshold between 1% and 99%";
      return null;
    case "rsi_above":
    case "rsi_below":
      if (threshold === undefined || threshold < 1 || threshold > 99)
        return "RSI alerts need a level between 1 and 99";
      return null;
    case "volume_spike":
      if (threshold === undefined || threshold < 110 || threshold > 10_000)
        return "Volume alerts need a multiplier between 1.1× and 100×";
      return null;
    case "ma_cross":
      return null; // no threshold
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(req, baseSchema);

    const problem = validateThreshold(body.kind, body.threshold);
    if (problem) return apiError(400, "invalid_threshold", problem);

    let symbol: string;
    try {
      symbol = normalizeSymbol(body.symbol);
      const quotes = await getQuotes([symbol]);
      if (!quotes.get(symbol)) throw new Error("no quote");
    } catch {
      return apiError(404, "unknown_symbol", "Unknown symbol");
    }

    const alert = db
      .insert(tables.alerts)
      .values({
        userId: user.id,
        symbol,
        kind: body.kind,
        threshold: body.kind === "ma_cross" ? null : (body.threshold ?? null),
      })
      .returning()
      .all()[0]!;
    return NextResponse.json({ alert });
  } catch (err) {
    if (err instanceof AuthError) return apiError(401, "unauthenticated", "Sign in required");
    if (err instanceof z.ZodError) {
      const first = err.issues[0];
      return apiError(400, "invalid_request", first?.message ?? "Invalid request");
    }
    console.error("[api] create alert failed:", err);
    return apiError(500, "internal", "Something went wrong");
  }
}

const patchSchema = z.object({ id: z.string().min(1), enabled: z.boolean() });

export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(req, patchSchema);

    const result = db
      .update(tables.alerts)
      .set({ enabled: body.enabled })
      .where(and(eq(tables.alerts.id, body.id), eq(tables.alerts.userId, user.id)))
      .run();
    if (result.changes === 0) return apiError(404, "not_found", "Alert not found");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return apiError(401, "unauthenticated", "Sign in required");
    if (err instanceof z.ZodError) {
      const first = err.issues[0];
      return apiError(400, "invalid_request", first?.message ?? "Invalid request");
    }
    console.error("[api] update alert failed:", err);
    return apiError(500, "internal", "Something went wrong");
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return apiError(400, "invalid_request", "id is required");

    const result = db
      .delete(tables.alerts)
      .where(and(eq(tables.alerts.id, id), eq(tables.alerts.userId, user.id)))
      .run();
    if (result.changes === 0) return apiError(404, "not_found", "Alert not found");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return apiError(401, "unauthenticated", "Sign in required");
    console.error("[api] delete alert failed:", err);
    return apiError(500, "internal", "Something went wrong");
  }
}
