import { z } from "zod";
import { parseBody, withUser } from "@/lib/api";
import { ensureDefaultPortfolio } from "@/lib/services/portfolio";
import { deposit } from "@/lib/services/trading";

const depositSchema = z.object({
  amountCents: z
    .number()
    .int("Amount must be a whole number of cents")
    .min(1, "Amount must be positive")
    .max(100_000_000_00, "Maximum deposit is $100,000,000"),
});

export const POST = withUser(async (req, { user }) => {
  const body = await parseBody(req, depositSchema);
  const portfolio = ensureDefaultPortfolio(user.id);
  const cashCents = deposit(portfolio.id, body.amountCents);
  return { ok: true, cashCents };
});
