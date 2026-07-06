"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { MarketStatusPayload } from "@/components/markets/types";

const SESSION_LABELS: Record<MarketStatusPayload["session"], string> = {
  pre: "Pre-market",
  regular: "Market open",
  after: "After hours",
  closed: "Market closed",
};

/** Open/closed dot + session label, refreshed every minute. */
export function MarketStatusLine() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["market-status"],
    queryFn: () => api<MarketStatusPayload>("/api/market/status"),
    refetchInterval: 60_000,
  });

  if (isPending) return <Skeleton className="h-5 w-28" />;
  if (isError || !data) {
    return <span className="text-xs text-ink-faint">Status unavailable</span>;
  }

  return (
    <span className="flex items-center gap-2 rounded-md border border-line bg-panel px-2.5 py-1 text-xs text-ink-muted">
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          data.open ? "bg-pos" : data.session === "closed" ? "bg-ink-faint" : "bg-warn",
        )}
      />
      {SESSION_LABELS[data.session]}
      <span className="text-ink-faint">· US equities</span>
    </span>
  );
}
