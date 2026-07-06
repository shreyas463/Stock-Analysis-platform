import type { Metadata } from "next";
import { TradeView } from "@/components/trade/trade-view";

export const metadata: Metadata = { title: "Paper Trading · Basis" };

export default async function TradePage({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string }>;
}) {
  const { symbol } = await searchParams;
  return <TradeView initialSymbol={symbol ?? null} />;
}
