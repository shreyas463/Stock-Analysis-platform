"use client";

import * as React from "react";
import Link from "next/link";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HistoryIcon, InboxIcon, ReceiptTextIcon } from "lucide-react";
import { toast } from "sonner";
import { api, del, ApiClientError } from "@/lib/client";
import { fmtCents, fmtQtyE4 } from "@/lib/money";
import { relativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/misc";
import { EmptyState, ErrorState, MoneyDelta } from "@/components/format";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ORDER_TYPE_LABELS,
  type OrderRow,
  type OrdersResponse,
  type TradesResponse,
} from "./types";

const dash = <span className="text-ink-faint">—</span>;

function SideBadge({ side }: { side: "buy" | "sell" }) {
  return <Badge variant={side === "buy" ? "pos" : "neg"}>{side === "buy" ? "Buy" : "Sell"}</Badge>;
}

function StatusBadge({ order }: { order: OrderRow }) {
  if (order.status === "filled") return <Badge variant="pos">Filled</Badge>;
  if (order.status === "cancelled") return <Badge variant="secondary">Cancelled</Badge>;
  if (order.status === "expired") return <Badge variant="secondary">Expired</Badge>;
  if (order.status === "open") return <Badge>Open</Badge>;
  const badge = <Badge variant="neg">Rejected</Badge>;
  if (!order.statusReason) return badge;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help">{badge}</span>
      </TooltipTrigger>
      <TooltipContent>{order.statusReason}</TooltipContent>
    </Tooltip>
  );
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => del<{ ok: boolean }>(`/api/orders/${orderId}`),
    onSuccess: () => {
      toast.success("Order cancelled");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiClientError ? err.message : "Could not cancel order");
    },
  });
}

export function OpenOrdersTable({ orders }: { orders: OrderRow[] }) {
  const cancel = useCancelOrder();
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<InboxIcon />}
        title="No open orders"
        description="Limit and stop orders rest here until their trigger price is reached."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Symbol</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Side</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Limit</TableHead>
          <TableHead className="text-right">Stop</TableHead>
          <TableHead>Placed</TableHead>
          <TableHead className="w-20" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((o) => (
          <TableRow key={o.id}>
            <TableCell>
              <Link
                href={`/research/${o.symbol}`}
                className="font-mono text-xs font-semibold text-ink transition-colors hover:text-brand"
              >
                {o.symbol}
              </Link>
            </TableCell>
            <TableCell className="text-xs text-ink-muted">{ORDER_TYPE_LABELS[o.type]}</TableCell>
            <TableCell>
              <SideBadge side={o.side} />
            </TableCell>
            <TableCell className="text-right tnum">{fmtQtyE4(o.qtyE4)}</TableCell>
            <TableCell className="text-right tnum">
              {o.limitPriceCents === null ? dash : fmtCents(o.limitPriceCents, { precise: true })}
            </TableCell>
            <TableCell className="text-right tnum">
              {o.stopPriceCents === null ? dash : fmtCents(o.stopPriceCents, { precise: true })}
            </TableCell>
            <TableCell className="text-xs text-ink-muted">{relativeTime(o.createdAt)}</TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                disabled={cancel.isPending && cancellingId === o.id}
                onClick={() => {
                  setCancellingId(o.id);
                  cancel.mutate(o.id);
                }}
              >
                {cancel.isPending && cancellingId === o.id ? "Cancelling…" : "Cancel"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function OrderHistoryTable({ orders }: { orders: OrderRow[] }) {
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<HistoryIcon />}
        title="No orders yet"
        description="Every order you place — filled, cancelled, or rejected — shows up here."
      />
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Symbol</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Side</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="text-right">Limit</TableHead>
          <TableHead className="text-right">Stop</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Placed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((o) => (
          <TableRow key={o.id}>
            <TableCell>
              <Link
                href={`/research/${o.symbol}`}
                className="font-mono text-xs font-semibold text-ink transition-colors hover:text-brand"
              >
                {o.symbol}
              </Link>
            </TableCell>
            <TableCell className="text-xs text-ink-muted">{ORDER_TYPE_LABELS[o.type]}</TableCell>
            <TableCell>
              <SideBadge side={o.side} />
            </TableCell>
            <TableCell className="text-right tnum">{fmtQtyE4(o.qtyE4)}</TableCell>
            <TableCell className="text-right tnum">
              {o.limitPriceCents === null ? dash : fmtCents(o.limitPriceCents, { precise: true })}
            </TableCell>
            <TableCell className="text-right tnum">
              {o.stopPriceCents === null ? dash : fmtCents(o.stopPriceCents, { precise: true })}
            </TableCell>
            <TableCell>
              <StatusBadge order={o} />
            </TableCell>
            <TableCell className="text-xs text-ink-muted">{relativeTime(o.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TradesTable() {
  const trades = useInfiniteQuery({
    queryKey: ["trades", "infinite"],
    queryFn: ({ pageParam }) =>
      api<TradesResponse>(`/api/trades?limit=50${pageParam ? `&before=${pageParam}` : ""}`),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  if (trades.isPending) {
    return (
      <div className="space-y-2 py-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }
  if (trades.isError) {
    return (
      <ErrorState description="Trade history could not be loaded." retry={() => trades.refetch()} />
    );
  }

  const rows = trades.data.pages.flatMap((p) => p.trades);
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<ReceiptTextIcon />}
        title="No fills yet"
        description="Executed trades appear here with fill price, slippage, and realized P/L."
      />
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Symbol</TableHead>
            <TableHead>Side</TableHead>
            <TableHead className="text-right">Fill</TableHead>
            <TableHead className="text-right">Realized P/L</TableHead>
            <TableHead className="text-right">Executed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((t) => {
            const slippageCents = t.priceCents - t.quotePriceCents;
            return (
              <TableRow key={t.id}>
                <TableCell>
                  <Link
                    href={`/research/${t.symbol}`}
                    className="font-mono text-xs font-semibold text-ink transition-colors hover:text-brand"
                  >
                    {t.symbol}
                  </Link>
                </TableCell>
                <TableCell>
                  <SideBadge side={t.side} />
                </TableCell>
                <TableCell className="text-right">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help tnum text-sm">
                        {fmtQtyE4(t.qtyE4)} @ {fmtCents(t.priceCents, { precise: true })}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Quote at execution: {fmtCents(t.quotePriceCents, { precise: true })} ·
                      slippage {fmtCents(slippageCents, { signed: true, precise: true })}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-right">
                  {t.realizedPnlCents === null ? (
                    dash
                  ) : (
                    <MoneyDelta cents={t.realizedPnlCents} className="text-xs" />
                  )}
                </TableCell>
                <TableCell className="text-right text-xs tnum text-ink-muted">
                  {new Date(t.executedAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {trades.hasNextPage && (
        <div className="flex justify-center border-t border-line py-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={trades.isFetchingNextPage}
            onClick={() => trades.fetchNextPage()}
          >
            {trades.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function OrdersPanel() {
  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: () => api<OrdersResponse>("/api/orders"),
  });

  return (
    <Card>
      <Tabs defaultValue="open">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <TabsList>
            <TabsTrigger value="open">
              Open orders
              {orders.data && orders.data.open.length > 0 && (
                <span className="ml-1.5 rounded-full bg-brand-soft px-1.5 text-[10px] tnum text-brand">
                  {orders.data.open.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">Order history</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent className="pt-0">
          <TabsContent value="open" className="mt-0">
            {orders.isPending ? (
              <div className="space-y-2 py-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            ) : orders.isError ? (
              <ErrorState
                description="Orders could not be loaded."
                retry={() => orders.refetch()}
              />
            ) : (
              <OpenOrdersTable orders={orders.data.open} />
            )}
          </TabsContent>
          <TabsContent value="history" className="mt-0">
            {orders.isPending ? (
              <div className="space-y-2 py-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            ) : orders.isError ? (
              <ErrorState
                description="Orders could not be loaded."
                retry={() => orders.refetch()}
              />
            ) : (
              <OrderHistoryTable orders={orders.data.recent} />
            )}
          </TabsContent>
          <TabsContent value="trades" className="mt-0">
            <TradesTable />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
