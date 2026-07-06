import { z } from "zod";
import { parseBody, withUser } from "@/lib/api";
import { ensureDefaultPortfolio, getOpenOrders, getOrderHistory } from "@/lib/services/portfolio";
import { placeOrder } from "@/lib/services/trading";

export const GET = withUser(async (_req, { user }) => {
  const portfolio = ensureDefaultPortfolio(user.id);
  return {
    open: getOpenOrders(portfolio.id),
    recent: getOrderHistory(portfolio.id, 50),
  };
});

const orderSchema = z.object({
  symbol: z.string().min(1).max(10),
  side: z.enum(["buy", "sell"]),
  type: z.enum(["market", "limit", "stop", "stop_limit"]),
  qtyE4: z.number().int().positive(),
  limitPriceCents: z.number().int().positive().optional(),
  stopPriceCents: z.number().int().positive().optional(),
  idempotencyKey: z.string().min(8),
});

export const POST = withUser(async (req, { user }) => {
  const body = await parseBody(req, orderSchema);
  // Portfolio always derived from the session — never trusted from the client.
  const portfolio = ensureDefaultPortfolio(user.id);
  const result = await placeOrder({
    portfolioId: portfolio.id,
    symbol: body.symbol,
    side: body.side,
    type: body.type,
    qtyE4: body.qtyE4,
    limitPriceCents: body.limitPriceCents ?? null,
    stopPriceCents: body.stopPriceCents ?? null,
    idempotencyKey: body.idempotencyKey,
  });
  return result;
});
