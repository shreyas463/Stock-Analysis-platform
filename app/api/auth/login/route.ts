import { z } from "zod";
import { eq } from "drizzle-orm";
import { apiError, parseBody, rateLimit, withPublic } from "@/lib/api";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { db, tables } from "@/lib/db";

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

export const POST = withPublic(async (req) => {
  const body = await parseBody(req, schema);
  const email = body.email.toLowerCase();

  if (!rateLimit(`login:${email}`, 10, 60_000)) {
    return apiError(429, "rate_limited", "Too many attempts — wait a minute and try again");
  }

  const user = db.select().from(tables.users).where(eq(tables.users.email, email)).all()[0];
  // Uniform error: never reveal whether the email exists.
  if (!user || !verifyPassword(body.password, user.passwordHash)) {
    return apiError(401, "invalid_credentials", "Incorrect email or password");
  }

  await createSession(user.id);
  return { ok: true };
});
