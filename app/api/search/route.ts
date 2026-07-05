import { withUser } from "@/lib/api";
import { searchSymbols } from "@/lib/market-data";

export const GET = withUser(async (req) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 40);
  const results = await searchSymbols(q);
  return { results };
});
