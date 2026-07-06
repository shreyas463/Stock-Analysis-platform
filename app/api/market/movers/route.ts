import { withUser } from "@/lib/api";
import { getMovers, isDemoMode } from "@/lib/market-data";

export const GET = withUser(async () => {
  const { gainers, losers } = await getMovers();
  return { gainers, losers, demoMode: isDemoMode(), asOf: Date.now() };
});
