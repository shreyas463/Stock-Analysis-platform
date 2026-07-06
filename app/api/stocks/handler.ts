import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { AuthError, requireUser } from "@/lib/auth/session";
import { normalizeSymbol, ProviderError } from "@/lib/market-data";

/**
 * Shared wrapper for /api/stocks/[symbol]/* dynamic routes: authenticates,
 * normalizes the symbol segment, and maps domain errors to JSON errors
 * without leaking internals. Handlers may return a NextResponse directly
 * (e.g. for validation errors) or any JSON-serializable value.
 */

type SymbolRouteContext = { params: Promise<{ symbol: string }> };

export function symbolRoute<T>(
  handler: (req: Request, symbol: string) => Promise<T | NextResponse>,
): (req: Request, ctx: SymbolRouteContext) => Promise<NextResponse> {
  return async (req, { params }) => {
    try {
      await requireUser();
      const { symbol: raw } = await params;
      const symbol = normalizeSymbol(decodeURIComponent(raw));
      const result = await handler(req, symbol);
      return result instanceof NextResponse ? result : NextResponse.json(result);
    } catch (err) {
      if (err instanceof AuthError) return apiError(401, "unauthenticated", "Sign in required");
      if (err instanceof ProviderError) {
        const status =
          err.kind === "not_found"
            ? 404
            : err.kind === "rate_limited"
              ? 429
              : err.kind === "disabled"
                ? 503
                : 502;
        return apiError(status, `provider_${err.kind}`, err.message);
      }
      console.error("[api/stocks] unhandled error:", err);
      return apiError(500, "internal", "Something went wrong");
    }
  };
}
