import { and, eq } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { getDailyCandles, getQuote } from "@/lib/market-data";
import { rsi, sma } from "@/lib/analytics/indicators";
import { fmtCents } from "@/lib/money";

/**
 * Alert evaluation. Rules are deterministic and evaluated on demand
 * (when the user loads the app) — a deliberate design for a single-process
 * paper platform: no background workers, no missed state, idempotent per day
 * via a re-trigger cooldown.
 */

const RETRIGGER_COOLDOWN_MS = 20 * 3600 * 1000; // once per ~day per rule

type AlertRow = typeof tables.alerts.$inferSelect;

async function evaluateAlert(alert: AlertRow): Promise<string | null> {
  if (!alert.symbol) return null;

  const quote = await getQuote(alert.symbol);
  const p = quote.priceCents;

  switch (alert.kind) {
    case "price_above":
      if (alert.threshold !== null && p >= alert.threshold) {
        return `${alert.symbol} is ${fmtCents(p)} — above your ${fmtCents(alert.threshold)} alert`;
      }
      return null;
    case "price_below":
      if (alert.threshold !== null && p <= alert.threshold) {
        return `${alert.symbol} is ${fmtCents(p)} — below your ${fmtCents(alert.threshold)} alert`;
      }
      return null;
    case "pct_move": {
      if (alert.threshold === null) return null;
      const movedBps = Math.abs(quote.changePct) * 10_000;
      if (movedBps >= alert.threshold) {
        return `${alert.symbol} moved ${(quote.changePct * 100).toFixed(1)}% today`;
      }
      return null;
    }
    case "volume_spike": {
      const series = await getDailyCandles(alert.symbol);
      const candles = series.candles;
      if (candles.length < 25) return null;
      const last = candles[candles.length - 1]!;
      const avg20 = candles.slice(-21, -1).reduce((a, c) => a + c.volume, 0) / 20;
      const multiplierX100 = alert.threshold ?? 200;
      if (avg20 > 0 && last.volume >= (avg20 * multiplierX100) / 100) {
        return `${alert.symbol} volume is ${(last.volume / avg20).toFixed(1)}× its 20-day average`;
      }
      return null;
    }
    case "rsi_above":
    case "rsi_below": {
      const series = await getDailyCandles(alert.symbol);
      const closes = series.candles.map((c) => c.closeCents);
      const values = rsi(closes, 14);
      const current = values[values.length - 1];
      if (current === null || current === undefined || alert.threshold === null) return null;
      if (alert.kind === "rsi_above" && current >= alert.threshold) {
        return `${alert.symbol} RSI(14) is ${current.toFixed(0)} — above ${alert.threshold}`;
      }
      if (alert.kind === "rsi_below" && current <= alert.threshold) {
        return `${alert.symbol} RSI(14) is ${current.toFixed(0)} — below ${alert.threshold}`;
      }
      return null;
    }
    case "ma_cross": {
      const series = await getDailyCandles(alert.symbol);
      const closes = series.candles.map((c) => c.closeCents);
      if (closes.length < 210) return null;
      const fast = sma(closes, 50);
      const slow = sma(closes, 200);
      const i = closes.length - 1;
      const f = fast[i];
      const s = slow[i];
      const fPrev = fast[i - 1];
      const sPrev = slow[i - 1];
      if (f == null || s == null || fPrev == null || sPrev == null) return null;
      if (fPrev <= sPrev && f > s)
        return `${alert.symbol}: 50-day MA crossed above 200-day (golden cross)`;
      if (fPrev >= sPrev && f < s)
        return `${alert.symbol}: 50-day MA crossed below 200-day (death cross)`;
      return null;
    }
    case "drawdown": {
      const series = await getDailyCandles(alert.symbol);
      const closes = series.candles.slice(-252).map((c) => c.closeCents);
      if (closes.length < 20 || alert.threshold === null) return null;
      const peak = Math.max(...closes);
      const dd = (peak - p) / peak;
      if (dd * 10_000 >= alert.threshold) {
        return `${alert.symbol} is ${(dd * 100).toFixed(0)}% below its 52-week high`;
      }
      return null;
    }
    default:
      return null;
  }
}

export async function evaluateAlertsForUser(userId: string): Promise<number> {
  const rules = db
    .select()
    .from(tables.alerts)
    .where(and(eq(tables.alerts.userId, userId), eq(tables.alerts.enabled, true)))
    .all();

  let triggered = 0;
  for (const rule of rules) {
    if (rule.lastTriggeredAt && Date.now() - rule.lastTriggeredAt < RETRIGGER_COOLDOWN_MS) continue;
    let message: string | null = null;
    try {
      message = await evaluateAlert(rule);
    } catch {
      continue; // no data → no alert; never invent a trigger
    }
    if (!message) continue;

    db.transaction((tx) => {
      tx.insert(tables.notifications)
        .values({
          userId,
          kind: "alert",
          title: "Alert triggered",
          body: message,
          href: rule.symbol ? `/research/${rule.symbol}` : "/alerts",
        })
        .run();
      tx.update(tables.alerts)
        .set({ lastTriggeredAt: Date.now() })
        .where(eq(tables.alerts.id, rule.id))
        .run();
    });
    triggered++;
  }
  return triggered;
}
