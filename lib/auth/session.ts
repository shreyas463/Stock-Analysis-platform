import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { and, eq, gt, lt } from "drizzle-orm";
import { db, tables } from "@/lib/db";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "basis_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type SessionUser = {
  id: string;
  email: string;
  username: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  db.insert(tables.sessions)
    .values({ tokenHash: hashToken(token), userId, expiresAt })
    .run();

  // Opportunistic cleanup of expired sessions.
  db.delete(tables.sessions).where(lt(tables.sessions.expiresAt, Date.now())).run();

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    db.delete(tables.sessions)
      .where(eq(tables.sessions.tokenHash, hashToken(token)))
      .run();
  }
  cookieStore.delete(SESSION_COOKIE);
}

/** Current user or null. Cached per-request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = db
    .select({
      id: tables.users.id,
      email: tables.users.email,
      username: tables.users.username,
    })
    .from(tables.sessions)
    .innerJoin(tables.users, eq(tables.sessions.userId, tables.users.id))
    .where(
      and(
        eq(tables.sessions.tokenHash, hashToken(token)),
        gt(tables.sessions.expiresAt, Date.now()),
      ),
    )
    .limit(1)
    .all();

  return rows[0] ?? null;
});

/** Throws a 401-shaped error for API routes; redirect handled in layouts. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("Not authenticated");
  }
  return user;
}

export class AuthError extends Error {
  status = 401;
}
