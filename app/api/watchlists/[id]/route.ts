import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody } from "@/lib/api";
import { AuthError, requireUser } from "@/lib/auth/session";
import { db, tables } from "@/lib/db";

function ownedList(userId: string, listId: string) {
  return db
    .select()
    .from(tables.watchlists)
    .where(and(eq(tables.watchlists.id, listId), eq(tables.watchlists.userId, userId)))
    .all()[0];
}

function handleError(err: unknown): NextResponse {
  if (err instanceof AuthError) return apiError(401, "unauthenticated", "Sign in required");
  if (err instanceof z.ZodError) {
    const first = err.issues[0];
    return apiError(400, "invalid_request", first?.message ?? "Invalid request");
  }
  console.error("[api] watchlist mutation failed:", err);
  return apiError(500, "internal", "Something went wrong");
}

const patchSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(40, "Keep names under 40 characters")
    .optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await parseBody(req, patchSchema);

    const list = ownedList(user.id, id);
    if (!list) return apiError(404, "not_found", "Watchlist not found");

    if (body.name && body.name !== list.name) {
      const clash = db
        .select({ id: tables.watchlists.id })
        .from(tables.watchlists)
        .where(
          and(
            eq(tables.watchlists.userId, user.id),
            eq(tables.watchlists.name, body.name),
            ne(tables.watchlists.id, id),
          ),
        )
        .all()[0];
      if (clash) return apiError(409, "duplicate", "You already have a watchlist with that name");
      db.update(tables.watchlists)
        .set({ name: body.name })
        .where(eq(tables.watchlists.id, id))
        .run();
    }

    const updated = ownedList(user.id, id);
    return NextResponse.json({ watchlist: updated });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const list = ownedList(user.id, id);
    if (!list) return apiError(404, "not_found", "Watchlist not found");

    db.delete(tables.watchlists).where(eq(tables.watchlists.id, id)).run();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
