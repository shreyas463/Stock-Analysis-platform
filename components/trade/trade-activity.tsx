"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ReceiptTextIcon } from "lucide-react";
import { api } from "@/lib/client";
import { fmtCents, fmtQtyE4 } from "@/lib/money";
import { relativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, MoneyDelta } from "@/components/format";
import { OpenOrdersTable } from "@/components/portfolio/orders-panel";
import type { OrdersResponse, TradesResponse } from "@/components/portfolio/types";

export function TradeActivity() {
  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: () => api<OrdersResponse>("/api/orders"),
  });
  const trades = useQuery({
    queryKey: ["trades", "recent"],
    queryFn: () => api<TradesResponse>("/api/trades?limit=5"),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Open orders</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {orders.isPending ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : orders.isError ? (
            <ErrorState description="Orders could not be loaded." retry={() => orders.refetch()} />
          ) : (
            <OpenOrdersTable orders={orders.data.open} />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent trades</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {trades.isPending ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : trades.isError ? (
            <ErrorState description="Trades could not be loaded." retry={() => trades.refetch()} />
          ) : trades.data.trades.length === 0 ? (
            <EmptyState
              icon={<ReceiptTextIcon />}
              title="No trades yet"
              description="Your five most recent fills will appear here."
            />
          ) : (
            <ul className="divide-y divide-line">
              {trades.data.trades.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={t.side === "buy" ? "pos" : "neg"}>
                      {t.side === "buy" ? "Buy" : "Sell"}
                    </Badge>
                    <Link
                      href={`/research/${t.symbol}`}
                      className="font-mono text-xs font-semibold text-ink transition-colors hover:text-brand"
                    >
                      {t.symbol}
                    </Link>
                    <span className="tnum text-xs text-ink-muted">
                      {fmtQtyE4(t.qtyE4)} @ {fmtCents(t.priceCents, { precise: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.realizedPnlCents !== null && (
                      <MoneyDelta cents={t.realizedPnlCents} className="text-xs" />
                    )}
                    <span className="text-xs text-ink-faint">{relativeTime(t.executedAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!trades.isPending && !trades.isError && trades.data.trades.length > 0 && (
            <EmptyRowLink />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyRowLink() {
  return (
    <p className="mt-2 text-right text-xs">
      <Link href="/portfolio" className="text-brand transition-colors hover:text-brand-strong">
        Full history →
      </Link>
    </p>
  );
}
