import { notFound, redirect } from "next/navigation";
import { FinancialsTab } from "@/components/research/financials-tab";
import { ForecastTab } from "@/components/research/forecast-tab";
import { NewsTab } from "@/components/research/news-tab";
import { OverviewTab } from "@/components/research/overview-tab";
import { PriceChart } from "@/components/research/price-chart";
import { RecentSymbolRecorder } from "@/components/research/recent-symbol-recorder";
import { StockHeader } from "@/components/research/stock-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getFundamentals,
  getProfile,
  getQuote,
  normalizeSymbol,
  UNIVERSE_BY_SYMBOL,
  type Quote,
} from "@/lib/market-data";

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return { title: `${decodeURIComponent(symbol).toUpperCase()} — Research — Basis` };
}

export default async function StockPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: rawParam } = await params;
  const raw = decodeURIComponent(rawParam);

  let symbol: string;
  try {
    symbol = normalizeSymbol(raw);
  } catch {
    notFound();
  }
  // Canonical URL: /research/AAPL, never /research/aapl.
  if (symbol !== raw) redirect(`/research/${encodeURIComponent(symbol)}`);

  const [quoteResult, profile, fundamentals] = await Promise.all([
    getQuote(symbol).then(
      (quote): { quote: Quote | null; error: string | null } => ({ quote, error: null }),
      (err: unknown) => ({
        quote: null,
        error: err instanceof Error ? err.message : "Quote unavailable",
      }),
    ),
    getProfile(symbol),
    getFundamentals(symbol),
  ]);

  // Nothing at all is known about this symbol — treat as not found.
  if (!quoteResult.quote && !profile) notFound();

  const universeEntry = UNIVERSE_BY_SYMBOL.get(symbol);
  const name = profile?.name ?? universeEntry?.name ?? symbol;

  return (
    <div className="space-y-5">
      <RecentSymbolRecorder symbol={symbol} name={name} />

      <StockHeader
        symbol={symbol}
        name={name}
        exchange={profile?.exchange ?? universeEntry?.exchange ?? null}
        sector={profile?.sector ?? universeEntry?.sector ?? null}
        industry={profile?.industry ?? universeEntry?.industry ?? null}
        quote={quoteResult.quote}
        quoteError={quoteResult.error}
      />

      <PriceChart symbol={symbol} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab quote={quoteResult.quote} profile={profile} fundamentals={fundamentals} />
        </TabsContent>
        <TabsContent value="forecast">
          <ForecastTab symbol={symbol} />
        </TabsContent>
        <TabsContent value="financials">
          <FinancialsTab profile={profile} fundamentals={fundamentals} />
        </TabsContent>
        <TabsContent value="news">
          <NewsTab symbol={symbol} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
