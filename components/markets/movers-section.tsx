"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { api } from "@/lib/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, Money, PctDelta } from "@/components/format";
import type { MoverLite, MoversPayload } from "@/components/markets/types";

function MoverRow({ mover, rank }: { mover: MoverLite; rank: number }) {
  return (
    <Link
      href={`/research/${mover.symbol}`}
      className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-panel-2/60"
    >
      <span className="tnum w-5 shrink-0 text-xs text-ink-faint">{rank}</span>
      <span className="w-14 shrink-0 text-sm font-medium">{mover.symbol}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-ink-muted">{mover.name}</span>
      <Money cents={mover.priceCents} className="shrink-0 text-sm" />
      <PctDelta value={mover.changePct} className="w-16 shrink-0 text-right text-sm" />
    </Link>
  );
}

function MoverListSkeleton() {
  return (
    <div className="space-y-2 py-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-0.5">
          <Skeleton className="h-3 w-5" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

function MoversCard({
  title,
  icon,
  movers,
  isPending,
}: {
  title: string;
  icon: React.ReactNode;
  movers: MoverLite[] | undefined;
  isPending: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        {icon}
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <MoverListSkeleton />
        ) : !movers || movers.length === 0 ? (
          <EmptyState
            title="No movers to show"
            description="Quotes for the coverage universe are unavailable right now."
          />
        ) : (
          <div>
            {movers.map((m, i) => (
              <MoverRow key={m.symbol} mover={m} rank={i + 1} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MoversSection() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["market-movers"],
    queryFn: () => api<MoversPayload>("/api/market/movers"),
    refetchInterval: 30_000,
  });

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load market movers"
        description="Live quotes for the coverage universe failed to load."
        retry={() => void refetch()}
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <MoversCard
        title="Top gainers"
        icon={<TrendingUpIcon className="size-4 text-pos" />}
        movers={data?.gainers}
        isPending={isPending}
      />
      <MoversCard
        title="Top losers"
        icon={<TrendingDownIcon className="size-4 text-neg" />}
        movers={data?.losers}
        isPending={isPending}
      />
    </div>
  );
}
