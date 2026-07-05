import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { apiError } from "@/lib/api";
import { AuthError, requireUser } from "@/lib/auth/session";
import { db, tables } from "@/lib/db";
import { cancelOrder } from "@/lib/services/trading";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    // Ownership: the order must belong to a portfolio owned by this user.
    const row = db
      .select({ orderId: tables.orders.id, portfolioId: tables.orders.portfolioId })
      .from(tables.orders)
      .innerJoin(tables.portfolios, eq(tables.orders.portfolioId, tables.portfolios.id))
      .where(and(eq(tables.orders.id, id), eq(tables.portfolios.userId, user.id)))
      .all()[0];
    if (!row) return apiError(404, "not_found", "Order not found");

    const cancelled = cancelOrder(row.portfolioId, row.orderId);
    if (!cancelled) return apiError(422, "not_open", "Order is no longer open");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return apiError(401, "unauthenticated", "Sign in required");
    console.error("[api] cancel order failed:", err);
    return apiError(500, "internal", "Something went wrong");
  }
}
