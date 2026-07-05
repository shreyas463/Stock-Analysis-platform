import { destroySession } from "@/lib/auth/session";
import { withPublic } from "@/lib/api";

export const POST = withPublic(async () => {
  await destroySession();
  return { ok: true };
});
