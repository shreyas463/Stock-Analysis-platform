"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ExternalLinkIcon, KeyRoundIcon, NewspaperIcon } from "lucide-react";
import { api } from "@/lib/client";
import { relativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/format";
import { SymbolFilter } from "@/components/news/symbol-filter";
import type { NewsItem, NewsPayload } from "@/components/news/types";

/** Normalized first-40-chars key used to fold near-identical headlines. */
function headlineKey(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 40);
}

type GroupedItem = { item: NewsItem; similar: number };

function groupConsecutive(items: NewsItem[]): GroupedItem[] {
  const out: GroupedItem[] = [];
  for (const item of items) {
    const prev = out[out.length - 1];
    if (prev && headlineKey(prev.item.headline) === headlineKey(item.headline)) {
      prev.similar += 1;
    } else {
      out.push({ item, similar: 0 });
    }
  }
  return out;
}

function ArticleCard({ item, similar }: GroupedItem) {
  return (
    <Card className="transition-colors hover:border-line-strong">
      <div className="flex gap-3 p-4">
        {item.imageUrl && (
          /* Remote news thumbnails come from arbitrary provider domains;
             next/image would need an open-ended remotePatterns allowlist. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            className="h-16 w-24 shrink-0 rounded object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium leading-snug transition-colors hover:text-brand"
            >
              {item.headline}
              <ExternalLinkIcon className="ml-1.5 inline size-3 align-baseline text-ink-faint" />
            </a>
            {similar > 0 && (
              <Badge variant="secondary" className="shrink-0">
                +{similar} similar
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {item.source} · {relativeTime(item.publishedAt)}
            {item.symbols.length > 0 && (
              <>
                {" · "}
                {item.symbols.slice(0, 4).map((s, i) => (
                  <React.Fragment key={s}>
                    {i > 0 && ", "}
                    <Link href={`/research/${s}`} className="text-brand hover:underline">
                      {s}
                    </Link>
                  </React.Fragment>
                ))}
              </>
            )}
          </p>
          {item.summary && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-muted">
              {item.summary}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function NewsListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <div className="flex gap-3 p-4">
            <Skeleton className="h-16 w-24 shrink-0 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function NewsClient() {
  const [symbol, setSymbol] = React.useState<string | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["news", symbol],
    queryFn: () =>
      api<NewsPayload>(symbol ? `/api/news?symbol=${encodeURIComponent(symbol)}` : "/api/news"),
    refetchInterval: 5 * 60_000,
  });

  // Demo mode: no fabricated headlines, full-page explanation instead.
  if (data?.demo) {
    return (
      <EmptyState
        icon={<KeyRoundIcon />}
        title="News requires a live data key"
        description="Basis never fabricates headlines. Connect a Finnhub API key in Settings to stream real company and market news."
        action={
          <Button asChild variant="secondary" size="sm">
            <Link href="/settings">Open Settings</Link>
          </Button>
        }
        className="py-20"
      />
    );
  }

  const grouped = data ? groupConsecutive(data.items) : [];

  return (
    <div className="space-y-4">
      <SymbolFilter symbol={symbol} onSelect={setSymbol} onClear={() => setSymbol(null)} />

      {isPending ? (
        <NewsListSkeleton />
      ) : isError ? (
        <ErrorState
          title="Couldn't load headlines"
          description="The news provider didn't respond. This is usually temporary."
          retry={() => void refetch()}
        />
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={<NewspaperIcon />}
          title={symbol ? `No recent headlines for ${symbol}` : "No headlines right now"}
          description={
            symbol
              ? "Try clearing the symbol filter or check back later."
              : "The provider returned no market news. Check back in a few minutes."
          }
          action={
            symbol ? (
              <Button variant="secondary" size="sm" onClick={() => setSymbol(null)}>
                Clear filter
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {symbol && (
            <p className="text-xs text-ink-muted">
              Showing company news for <span className="font-medium text-ink">{symbol}</span>
            </p>
          )}
          {grouped.map((g) => (
            <ArticleCard key={g.item.id} item={g.item} similar={g.similar} />
          ))}
        </div>
      )}
    </div>
  );
}
