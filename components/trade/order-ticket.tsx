"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangleIcon, CheckCircle2Icon, ClockIcon } from "lucide-react";
import { toast } from "sonner";
import type { PortfolioOverview } from "@/lib/services/portfolio";
import { api, post, ApiClientError } from "@/lib/client";
import { fmtCents, fmtQtyE4, notionalCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/misc";
import { SourceBadge } from "@/components/format";
import {
  ORDER_TYPE_LABELS,
  type MarketStatusResponse,
  type PlaceOrderResponse,
  type QuoteResponse,
} from "@/components/portfolio/types";
import { SymbolCombobox } from "./symbol-combobox";

type OrderType = "market" | "limit" | "stop" | "stop_limit";
type Side = "buy" | "sell";

const SLIPPAGE_CAPTION = "Market orders assume 0.05% slippage";

function slip(priceCents: number, side: Side): number {
  const factor = side === "buy" ? 1.0005 : 0.9995;
  return Math.max(1, Math.round(priceCents * factor));
}

function parseDollarsToCents(s: string): number | null {
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function parseQtyE4(s: string): number | null {
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  const e4 = Math.round(n * 10_000);
  return e4 > 0 ? e4 : null;
}

type LastResult =
  | { kind: "filled"; symbol: string; side: Side; qtyE4: number; fillPriceCents: number }
  | { kind: "resting"; symbol: string; side: Side; qtyE4: number };

export function OrderTicket({
  symbol,
  onSymbolChange,
}: {
  symbol: string | null;
  onSymbolChange: (symbol: string | null) => void;
}) {
  const queryClient = useQueryClient();

  const [side, setSide] = React.useState<Side>("buy");
  const [type, setType] = React.useState<OrderType>("market");
  const [qtyStr, setQtyStr] = React.useState("");
  const [limitStr, setLimitStr] = React.useState("");
  const [stopStr, setStopStr] = React.useState("");
  const [idemKey, setIdemKey] = React.useState<string>(() => crypto.randomUUID());
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [lastResult, setLastResult] = React.useState<LastResult | null>(null);

  const quoteQuery = useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => api<QuoteResponse>(`/api/quote?symbol=${encodeURIComponent(symbol!)}`),
    enabled: !!symbol,
    refetchInterval: 30_000,
  });
  const portfolioQuery = useQuery({
    queryKey: ["portfolio"],
    queryFn: () => api<PortfolioOverview>("/api/portfolio"),
  });
  const marketQuery = useQuery({
    queryKey: ["market-status"],
    queryFn: () => api<MarketStatusResponse>("/api/market/status"),
    refetchInterval: 60_000,
  });

  const quote = quoteQuery.data?.quote ?? null;
  const portfolio = portfolioQuery.data ?? null;
  const position = symbol ? (portfolio?.positions.find((p) => p.symbol === symbol) ?? null) : null;

  const qtyE4 = parseQtyE4(qtyStr);
  const limitCents = parseDollarsToCents(limitStr);
  const stopCents = parseDollarsToCents(stopStr);
  const needsLimit = type === "limit" || type === "stop_limit";
  const needsStop = type === "stop" || type === "stop_limit";

  // Estimated fill price per order type (informational; server re-prices).
  const estFillCents = React.useMemo(() => {
    if (type === "market") return quote ? slip(quote.priceCents, side) : null;
    if (type === "limit" || type === "stop_limit") return limitCents;
    return stopCents ? slip(stopCents, side) : null;
  }, [type, quote, side, limitCents, stopCents]);

  const estNotional = estFillCents && qtyE4 ? notionalCents(estFillCents, qtyE4) : null;
  const cashAfter =
    estNotional !== null && portfolio
      ? side === "buy"
        ? portfolio.cashCents - estNotional
        : portfolio.cashCents + estNotional
      : null;

  function applyMax() {
    if (side === "sell") {
      if (position) setQtyStr(String(position.qtyE4 / 10_000));
      return;
    }
    const base = estFillCents ?? (quote ? slip(quote.priceCents, "buy") : null);
    if (!base || !portfolio) return;
    const maxE4 = Math.floor((portfolio.buyingPowerCents * 10_000) / base);
    setQtyStr(String(Math.max(maxE4, 0) / 10_000));
  }

  // What (if anything) blocks review?
  const blocker = React.useMemo<string | null>(() => {
    if (!symbol) return "Choose a symbol to trade";
    if (quoteQuery.isError) return `No quote available for ${symbol} — orders need real price data`;
    if (!qtyE4) return "Enter a quantity";
    if (qtyE4 > 1_000_000 * 10_000) return "Quantity exceeds the maximum order size";
    if (needsLimit && !limitCents) return "Enter a limit price";
    if (needsStop && !stopCents) return "Enter a stop price";
    if (side === "sell") {
      if (!position) return `You don't hold ${symbol}`;
      if (qtyE4 > position.qtyE4)
        return `Exceeds your position of ${fmtQtyE4(position.qtyE4)} shares`;
    }
    if (
      side === "buy" &&
      estNotional !== null &&
      portfolio &&
      estNotional > portfolio.buyingPowerCents
    )
      return "Estimated cost exceeds your buying power";
    return null;
  }, [
    symbol,
    quoteQuery.isError,
    qtyE4,
    needsLimit,
    limitCents,
    needsStop,
    stopCents,
    side,
    position,
    estNotional,
    portfolio,
  ]);

  const placeMutation = useMutation({
    mutationFn: () =>
      post<PlaceOrderResponse>("/api/orders", {
        symbol,
        side,
        type,
        qtyE4,
        ...(needsLimit && limitCents ? { limitPriceCents: limitCents } : {}),
        ...(needsStop && stopCents ? { stopPriceCents: stopCents } : {}),
        idempotencyKey: idemKey,
      }),
    onSuccess: (result) => {
      setReviewOpen(false);
      setServerError(null);
      setIdemKey(crypto.randomUUID()); // fresh key for the next order
      if (result.status === "filled" && result.fillPriceCents && symbol && qtyE4) {
        setLastResult({
          kind: "filled",
          symbol,
          side,
          qtyE4,
          fillPriceCents: result.fillPriceCents,
        });
        toast.success(
          `${side === "buy" ? "Bought" : "Sold"} ${fmtQtyE4(qtyE4)} ${symbol} at ${fmtCents(result.fillPriceCents, { precise: true })}`,
        );
      } else if (symbol && qtyE4) {
        setLastResult({ kind: "resting", symbol, side, qtyE4 });
        toast.success("Order accepted and resting");
      }
      setQtyStr("");
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["trades"] });
    },
    onError: (err) => {
      setReviewOpen(false);
      setServerError(
        err instanceof ApiClientError ? err.message : "Order failed — please try again",
      );
    },
  });

  const marketClosed = marketQuery.data ? !marketQuery.data.open : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order ticket</CardTitle>
        <CardDescription>
          Paper order — simulated execution at the latest available quote.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {marketClosed && (
          <div className="flex items-center gap-2 rounded-md bg-warn-soft px-3 py-2 text-xs text-warn">
            <ClockIcon className="size-4 shrink-0" />
            Market closed — fills at last available price
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="ticket-symbol">Symbol</Label>
          <SymbolCombobox
            id="ticket-symbol"
            value={symbol}
            onSelect={(s) => {
              onSymbolChange(s);
              setServerError(null);
              setLastResult(null);
            }}
          />
          {symbol && quote && (
            <p className="flex items-center gap-1.5 text-xs text-ink-muted">
              <span className="font-mono font-semibold text-ink">{symbol}</span>
              <span className="tnum">{fmtCents(quote.priceCents, { precise: true })}</span>
              <SourceBadge
                synthetic={quote.synthetic}
                stale={quote.stale}
                source={quote.source}
                asOf={quote.asOf}
              />
            </p>
          )}
        </div>

        {/* Side segmented control */}
        <div
          className="grid grid-cols-2 gap-1 rounded-md border border-line bg-panel-2 p-1"
          role="radiogroup"
          aria-label="Order side"
        >
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={side === s}
              onClick={() => setSide(s)}
              className={cn(
                "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
                side === s
                  ? s === "buy"
                    ? "bg-pos-soft text-pos shadow-xs"
                    : "bg-neg-soft text-neg shadow-xs"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {s === "buy" ? "Buy" : "Sell"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ticket-type">Order type</Label>
            <Select value={type} onValueChange={(v) => setType(v as OrderType)}>
              <SelectTrigger id="ticket-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ORDER_TYPE_LABELS) as OrderType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {ORDER_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ticket-qty">Quantity (shares)</Label>
            <div className="relative">
              <Input
                id="ticket-qty"
                inputMode="decimal"
                placeholder="0.0000"
                className="pr-14 tnum"
                value={qtyStr}
                onChange={(e) => setQtyStr(e.target.value.replace(/[^0-9.]/g, ""))}
              />
              <button
                type="button"
                onClick={applyMax}
                disabled={side === "buy" ? !portfolio || !symbol || !quote : !position}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded border border-line bg-panel-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted transition-colors hover:text-ink disabled:opacity-40"
              >
                Max
              </button>
            </div>
          </div>
        </div>

        {(needsLimit || needsStop) && (
          <div className="grid grid-cols-2 gap-3">
            {needsStop && (
              <div className="space-y-1.5">
                <Label htmlFor="ticket-stop">Stop price</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
                    $
                  </span>
                  <Input
                    id="ticket-stop"
                    inputMode="decimal"
                    className="pl-7 tnum"
                    placeholder="0.00"
                    value={stopStr}
                    onChange={(e) => setStopStr(e.target.value.replace(/[^0-9.]/g, ""))}
                  />
                </div>
              </div>
            )}
            {needsLimit && (
              <div className="space-y-1.5">
                <Label htmlFor="ticket-limit">Limit price</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
                    $
                  </span>
                  <Input
                    id="ticket-limit"
                    inputMode="decimal"
                    className="pl-7 tnum"
                    placeholder="0.00"
                    value={limitStr}
                    onChange={(e) => setLimitStr(e.target.value.replace(/[^0-9.]/g, ""))}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live estimate */}
        <div className="space-y-1.5 rounded-md border border-line bg-panel-2/50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted">Est. fill price</span>
            <span className="tnum">
              {estFillCents ? fmtCents(estFillCents, { precise: true }) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted">
              Est. {side === "buy" ? "cost" : "proceeds"}
            </span>
            <span className="tnum font-medium">
              {estNotional !== null ? fmtCents(estNotional) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted">Cash after</span>
            <span className={cn("tnum", cashAfter !== null && cashAfter < 0 && "text-neg")}>
              {cashAfter !== null ? fmtCents(cashAfter) : "—"}
            </span>
          </div>
          {type === "market" && (
            <p className="pt-1 text-[11px] text-ink-faint">{SLIPPAGE_CAPTION}</p>
          )}
        </div>

        {serverError && (
          <div className="flex items-start gap-2 rounded-md bg-neg-soft px-3 py-2 text-xs text-neg">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <Button
          className="w-full"
          variant={side === "buy" ? "pos" : "destructive"}
          disabled={!!blocker || placeMutation.isPending}
          onClick={() => setReviewOpen(true)}
        >
          {blocker ?? `Review ${side} order`}
        </Button>

        {lastResult && (
          <div className="flex items-start gap-2 rounded-md bg-pos-soft px-3 py-2.5 text-xs text-pos">
            <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-0.5">
              {lastResult.kind === "filled" ? (
                <p>
                  {lastResult.side === "buy" ? "Bought" : "Sold"} {fmtQtyE4(lastResult.qtyE4)}{" "}
                  {lastResult.symbol} at{" "}
                  <span className="tnum font-semibold">
                    {fmtCents(lastResult.fillPriceCents, { precise: true })}
                  </span>
                </p>
              ) : (
                <p>
                  {lastResult.side === "buy" ? "Buy" : "Sell"} order for{" "}
                  {fmtQtyE4(lastResult.qtyE4)} {lastResult.symbol} is resting until its trigger
                  price is reached.
                </p>
              )}
              <Link href="/portfolio" className="font-medium underline underline-offset-2">
                View portfolio →
              </Link>
            </div>
          </div>
        )}

        <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Review order</DialogTitle>
              <DialogDescription>Confirm the details before submitting.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <ReviewRow label="Symbol">
                <span className="font-mono font-semibold">{symbol}</span>
              </ReviewRow>
              <ReviewRow label="Side">
                <span className={side === "buy" ? "font-medium text-pos" : "font-medium text-neg"}>
                  {side === "buy" ? "Buy" : "Sell"}
                </span>
              </ReviewRow>
              <ReviewRow label="Type">{ORDER_TYPE_LABELS[type]}</ReviewRow>
              <ReviewRow label="Quantity">
                <span className="tnum">{qtyE4 ? fmtQtyE4(qtyE4) : "—"} shares</span>
              </ReviewRow>
              {needsStop && stopCents && (
                <ReviewRow label="Stop price">
                  <span className="tnum">{fmtCents(stopCents, { precise: true })}</span>
                </ReviewRow>
              )}
              {needsLimit && limitCents && (
                <ReviewRow label="Limit price">
                  <span className="tnum">{fmtCents(limitCents, { precise: true })}</span>
                </ReviewRow>
              )}
              <Separator />
              <ReviewRow label="Est. fill price">
                <span className="tnum">
                  {estFillCents ? fmtCents(estFillCents, { precise: true }) : "—"}
                </span>
              </ReviewRow>
              <ReviewRow label={side === "buy" ? "Est. cost" : "Est. proceeds"}>
                <span className="tnum font-medium">
                  {estNotional !== null ? fmtCents(estNotional) : "—"}
                </span>
              </ReviewRow>
              <ReviewRow label="Cash after">
                <span className="tnum">{cashAfter !== null ? fmtCents(cashAfter) : "—"}</span>
              </ReviewRow>
              {type === "market" && (
                <p className="text-[11px] text-ink-faint">{SLIPPAGE_CAPTION}</p>
              )}
              {marketClosed && (
                <p className="text-[11px] text-warn">
                  Market closed — fills at last available price
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setReviewOpen(false)}>
                Back
              </Button>
              <Button
                variant={side === "buy" ? "pos" : "destructive"}
                disabled={placeMutation.isPending}
                onClick={() => placeMutation.mutate()}
              >
                {placeMutation.isPending
                  ? "Submitting…"
                  : `${side === "buy" ? "Buy" : "Sell"} ${qtyE4 ? fmtQtyE4(qtyE4) : ""} ${symbol ?? ""}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-ink-muted">{label}</span>
      <span>{children}</span>
    </div>
  );
}
