import { desc, eq } from "drizzle-orm";
import { withUser } from "@/lib/api";
import { db, tables } from "@/lib/db";
import { evaluateAlertsForUser } from "@/lib/services/alerts";

export const GET = withUser(async (_req, { user }) => {
  // Evaluate the user's alert rules on demand (cheap, cached quotes).
  await evaluateAlertsForUser(user.id).catch(() => {});

  const notifications = db
    .select()
    .from(tables.notifications)
    .where(eq(tables.notifications.userId, user.id))
    .orderBy(desc(tables.notifications.createdAt))
    .limit(30)
    .all();
  return { notifications };
});
