import { withUser } from "@/lib/api";
import { getPortfolioOverview } from "@/lib/services/portfolio";

export const GET = withUser(async (_req, { user }) => {
  return getPortfolioOverview(user.id);
});
