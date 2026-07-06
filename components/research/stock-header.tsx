"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { ArrowRightLeft, Loader2, Star, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { MoneyDelta, PctDelta, SourceBadge } from "@/components/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { post } from "@/lib/client";
import { fmtCents } from "@/lib/money";
import type { Quote } from "@/lib/market-data/types";

export function StockHeader({
  symbol,
  name,
  exchange,
  sector,
  industry,
  quote,
  quoteError,
}: {
  symbol: string;
  name: string;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  quote: Quote | null;
  quoteError: string | null;
}) {
  const addToWatchlist = useMutation({
    mutationFn: () => post<unknown>("/api/watchlists/quick-add", { symbol }),
    onSuccess: () => toast.success(`${symbol} added to watchlist`),
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h1 className="font-mono text-xl font-semibold tracking-tight text-brand">{symbol}</h1>
          <span className="text-lg font-semibold tracking-tight text-ink">{name}</span>
          {exchange && <Badge variant="outline">{exchange}</Badge>}
          {sector && <Badge variant="secondary">{sector}</Badge>}
          {industry && industry !== sector && (
            <span className="text-xs text-ink-faint">{industry}</span>
          )}
        </div>

        {quote ? (
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="tnum text-3xl font-semibold tracking-tight">
              {fmtCents(quote.priceCents)}
            </span>
            <MoneyDelta cents={quote.changeCents} className="text-sm font-medium" />
            <PctDelta value={quote.changePct} className="text-sm font-medium" />
            <SourceBadge
              synthetic={quote.synthetic}
              stale={quote.stale}
              source={quote.source}
              asOf={quote.asOf}
            />
            <span className="text-xs text-ink-muted">
              as of{" "}
              {new Date(quote.asOf).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-xs text-ink">
            <TriangleAlert className="size-4 shrink-0 text-warn" aria-hidden />
            <span>
              Live quote unavailable{quoteError ? ` — ${quoteError}` : ""}. Historical data below
              may still load.
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => addToWatchlist.mutate()}
          disabled={addToWatchlist.isPending}
        >
          {addToWatchlist.isPending ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Star aria-hidden />
          )}
          {addToWatchlist.isPending ? "Adding…" : "Add to watchlist"}
        </Button>
        <Button asChild>
          <Link href={`/trade?symbol=${encodeURIComponent(symbol)}`}>
            <ArrowRightLeft aria-hidden />
            Trade
          </Link>
        </Button>
      </div>
    </div>
  );
}
