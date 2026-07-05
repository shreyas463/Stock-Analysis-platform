/**
 * "Recently viewed" symbols, persisted in localStorage. Presentation-only
 * client state — safe to lose, never trusted for anything financial.
 */

const KEY = "basis.research.recent";
const MAX = 8;

export type RecentSymbol = { symbol: string; name: string | null };

export function readRecent(): RecentSymbol[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: RecentSymbol[] = [];
    for (const entry of parsed) {
      if (
        entry !== null &&
        typeof entry === "object" &&
        typeof (entry as { symbol?: unknown }).symbol === "string"
      ) {
        const e = entry as { symbol: string; name?: unknown };
        out.push({ symbol: e.symbol, name: typeof e.name === "string" ? e.name : null });
      }
    }
    return out.slice(0, MAX);
  } catch {
    return [];
  }
}

export function recordRecent(symbol: string, name: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const next = [{ symbol, name }, ...readRecent().filter((r) => r.symbol !== symbol)].slice(
      0,
      MAX,
    );
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full/blocked — recently-viewed is best-effort only.
  }
}

export function clearRecent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
