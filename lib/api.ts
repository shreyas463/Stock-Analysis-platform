import { NextResponse } from "next/server";
import { z, type ZodType } from "zod";
import { AuthError, requireUser, type SessionUser } from "@/lib/auth/session";
import { ProviderError } from "@/lib/market-data/types";
import { TradeError } from "@/lib/services/trading";

/**
 * Route-handler helpers: consistent auth, validation and error mapping.
 * Handlers never leak stack traces or secrets to the client.
 */

export type ApiContext = { user: SessionUser };

type Handler<T> = (req: Request, ctx: ApiContext) => Promise<T>;

export function apiError(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

function mapError(err: unknown): NextResponse {
  if (err instanceof AuthError) return apiError(401, "unauthenticated", "Sign in required");
  if (err instanceof TradeError) {
    const status = err.code === "not_found" ? 404 : 422;
    return apiError(status, err.code, err.message);
  }
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
  if (err instanceof z.ZodError) {
    const first = err.issues[0];
    return apiError(
      400,
      "invalid_request",
      first ? `${first.path.join(".") || "body"}: ${first.message}` : "Invalid request",
    );
  }
  console.error("[api] unhandled error:", err);
  return apiError(500, "internal", "Something went wrong");
}

/** Authenticated JSON handler. Handlers may return data or a NextResponse (e.g. apiError). */
export function withUser<T>(handler: Handler<T>): (req: Request) => Promise<NextResponse> {
  return async (req) => {
    try {
      const user = await requireUser();
      const result = await handler(req, { user });
      if (result instanceof Response) return result as unknown as NextResponse;
      return NextResponse.json(result);
    } catch (err) {
      return mapError(err);
    }
  };
}

/** Unauthenticated JSON handler (login/register only). */
export function withPublic<T>(
  handler: (req: Request) => Promise<T>,
): (req: Request) => Promise<NextResponse> {
  return async (req) => {
    try {
      const result = await handler(req);
      if (result instanceof Response) return result as unknown as NextResponse;
      return NextResponse.json(result);
    } catch (err) {
      return mapError(err);
    }
  };
}

export async function parseBody<S extends ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new z.ZodError([{ code: "custom", message: "Request body must be JSON", path: [] }]);
  }
  return schema.parse(json);
}

/** Naive per-process rate limiter for sensitive endpoints (login, register). */
const hits = new Map<string, { count: number; resetAt: number }>();
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}
