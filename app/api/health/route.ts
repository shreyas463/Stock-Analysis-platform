import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { isDemoMode } from "@/lib/market-data";

/**
 * Liveness + readiness probe for container hosts (Railway/Render/Fly).
 * Unauthenticated by design. Confirms the process is up and the SQLite
 * database answers a trivial query before reporting healthy.
 */
export const dynamic = "force-dynamic";

export function GET() {
  try {
    db.run(sql`SELECT 1`);
    return NextResponse.json({
      status: "ok",
      db: "ok",
      mode: isDemoMode() ? "demo" : "live",
      time: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ status: "error", db: "unavailable" }, { status: 503 });
  }
}
