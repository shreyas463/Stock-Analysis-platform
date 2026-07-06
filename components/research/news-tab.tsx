"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Newspaper } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/format";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/client";
import { relativeTime } from "@/lib/utils";
import type { NewsItem } from "@/lib/market-data/types";

type NewsResponse = { demo: boolean; items: NewsItem[] };

function NewsSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-md border border-line bg-panel p-3">
          <Skeleton className="h-14 w-20 shrink-0 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NewsTab({ symbol }: { symbol: string }) {
  const query = useQuery({
    queryKey: ["stock-news", symbol],
    queryFn: () => api<NewsResponse>(`/api/stocks/${encodeURIComponent(symbol)}/news`),
    staleTime: 5 * 60_000,
  });

  if (query.isPending) return <NewsSkeleton />;

  if (query.isError) {
    return (
      <ErrorState
        title="Couldn't load news"
        description={query.error.message}
        retry={() => void query.refetch()}
      />
    );
  }

  const { demo, items } = query.data;

  if (demo) {
    return (
      <EmptyState
        icon={<Newspaper aria-hidden />}
        title="News requires a live data key"
        description="Demo mode serves simulated prices only — headlines are never fabricated. Add a FINNHUB_API_KEY to see real company news."
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Newspaper aria-hidden />}
        title={`No recent headlines for ${symbol}`}
        description="The provider returned no company news for this symbol in the recent window."
      />
    );
  }

  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="group flex gap-3 rounded-md border border-line bg-panel p-3 transition-colors hover:border-line-strong hover:bg-panel-2/60"
          >
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote news thumbnails have unknown hosts
              <img
                src={item.imageUrl}
                alt=""
                loading="lazy"
                className="h-14 w-20 shrink-0 rounded-md border border-line object-cover"
              />
            ) : (
              <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-md border border-line bg-panel-2">
                <Newspaper className="size-5 text-ink-faint" aria-hidden />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="flex items-start gap-1.5 text-sm font-medium text-ink transition-colors group-hover:text-brand">
                <span className="line-clamp-2">{item.headline}</span>
                <ExternalLink
                  className="mt-0.5 size-3.5 shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </p>
              {item.summary && (
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{item.summary}</p>
              )}
              <p className="mt-1 text-[11px] text-ink-faint">
                {item.source} · {relativeTime(item.publishedAt)}
              </p>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
