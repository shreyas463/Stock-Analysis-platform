import { withUser } from "@/lib/api";
import { getMarketStatus, isDemoMode } from "@/lib/market-data";

export const GET = withUser(async () => {
  const status = getMarketStatus();
  return { ...status, demoMode: isDemoMode() };
});
