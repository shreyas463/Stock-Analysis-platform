import { z } from "zod";
import { eq, or } from "drizzle-orm";
import { apiError, parseBody, rateLimit, withPublic } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { db, tables } from "@/lib/db";
import { ensureDefaultPortfolio } from "@/lib/services/portfolio";

const schema = z.object({
  email: z.string().email().max(254),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only"),
  password: z.string().min(8).max(128),
});

export const POST = withPublic(async (req) => {
  if (!rateLimit("register", 20, 60_000)) {
    throw Object.assign(new Error("Too many attempts, try again shortly"), { status: 429 });
  }
  const body = await parseBody(req, schema);
  const email = body.email.toLowerCase();

  const existing = db
    .select({ id: tables.users.id })
    .from(tables.users)
    .where(or(eq(tables.users.email, email), eq(tables.users.username, body.username)))
    .all();
  if (existing.length > 0) {
    return apiError(409, "exists", "An account with that email or username already exists");
  }

  const user = db
    .insert(tables.users)
    .values({ email, username: body.username, passwordHash: hashPassword(body.password) })
    .returning()
    .all()[0]!;

  ensureDefaultPortfolio(user.id);
  await createSession(user.id);
  return { ok: true };
});
