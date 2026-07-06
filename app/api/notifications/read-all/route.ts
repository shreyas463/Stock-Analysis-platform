import { eq, isNull, and } from "drizzle-orm";
import { withUser } from "@/lib/api";
import { db, tables } from "@/lib/db";

export const POST = withUser(async (_req, { user }) => {
  db.update(tables.notifications)
    .set({ readAt: Date.now() })
    .where(and(eq(tables.notifications.userId, user.id), isNull(tables.notifications.readAt)))
    .run();
  return { ok: true };
});
