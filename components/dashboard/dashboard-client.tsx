"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ActivityIcon,
  ArrowRightIcon,
  BellIcon,
  LineChartIcon,
  ListIcon,
  ReceiptTextIcon,
} from "lucide-react";
import { api } from "@/lib/client";
import { cn, relativeTime } from "@/lib/utils";
import { fmtCents, fmtQtyE4 } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/misc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EmptyState,
  ErrorState,
  Money,
  MoneyDelta,
  PctDelta,
  SourceBadge,
} from "@/components/format";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import type { DashboardPayload, QuoteLite } from "@/components/dashboard/types";

const INDEX_LABELS: Record<string, string> = {
  SPY: "S&P 500 ETF",
  QQQ: "Nasdaq-100 ETF",
};

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// ── small building blocks ───────────────────────────────────────────

function MicroLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] uppercase tracking-wide text-ink-faint", className)}>
      {children}
    </p>
  );
}

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const w = 120;
  const h = 36;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - 2 - ((v - min) / span) * (h - 6);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("pointer-events-none", className)}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function StatCard({
  label,
  badge,
  value,
  sub,
  decoration,
}: {
  label: string;
  badge?: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  decoration?: React.ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden">
      {decoration}
      <CardContent className="relative p-4">
        <div className="flex items-start justify-between gap-2">
          <MicroLabel>{label}</MicroLabel>
          {badge}
        </div>
        <div className="tnum mt-1.5 text-2xl font-semibold tracking-tight">{value}</div>
        {sub != null && (
          <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">{sub}</div>
        )}
      </CardContent>
    </Card>
  );
}

function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-brand transition-colors hover:text-brand-strong"
    >
      {children}
      <ArrowRightIcon className="size-3" />
    </Link>
  );
}

function QuoteRow({ quote, label }: { quote: QuoteLite; label?: string }) {
  return (
    <Link
      href={`/research/${quote.symbol}`}
      className="-mx-2 flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-panel-2/60"
    >
      <span className="min-w-0">
        <span className="text-sm font-medium">{quote.symbol}</span>
        {label && <span className="ml-2 truncate text-xs text-ink-muted">{label}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <Money cents={quote.priceCents} className="text-sm" />
        <PctDelta value={quote.changePct} className="w-16 text-right text-xs" />
      </span>
    </Link>
  );
}

// ── sections ────────────────────────────────────────────────────────

function HeroStrip({ data }: { data: DashboardPayload }) {
  const { summary, snapshots } = data;
  const sparkValues = snapshots.map((s) => s.totalValueCents);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <StatCard
        label="Total value"
        badge={
          <SourceBadge
            synthetic={summary.anySynthetic}
            stale={summary.anyStale}
            asOf={summary.asOf}
          />
        }
        value={fmtCents(summary.totalValueCents)}
        sub={<span>Cash + positions</span>}
        decoration={
          sparkValues.length >= 2 ? (
            <Sparkline
              values={sparkValues}
              className="absolute inset-x-0 bottom-0 h-9 w-full text-chart-1 opacity-40"
            />
          ) : undefined
        }
      />
      <StatCard
        label="Day P/L"
        value={<MoneyDelta cents={summary.dayChangeCents} />}
        sub={<PctDelta value={summary.dayChangePct} />}
      />
      <StatCard
        label="Total return"
        value={<MoneyDelta cents={summary.totalReturnCents} />}
        sub={
          <>
            <PctDelta value={summary.totalReturnPct} />
            <span>vs {fmtCents(summary.totalDepositsCents)} deposited</span>
          </>
        }
      />
      <StatCard
        label="Paper cash"
        value={fmtCents(summary.cashCents)}
        sub={<span>Buying power {fmtCents(summary.buyingPowerCents)}</span>}
      />
      <StatCard
        label="Unrealized P/L"
        value={<MoneyDelta cents={summary.unrealizedPnlCents} />}
        sub={<span>Cost basis {fmtCents(summary.investedCostCents)}</span>}
      />
    </div>
  );
}

function PerformanceCard({ data }: { data: DashboardPayload }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Performance</CardTitle>
          <p className="mt-0.5 text-xs text-ink-muted">Daily portfolio value snapshots</p>
        </div>
        {data.demoMode && <SourceBadge synthetic />}
      </CardHeader>
      <CardContent>
        {data.snapshots.length >= 2 ? (
          <PerformanceChart snapshots={data.snapshots} />
        ) : (
          <EmptyState
            icon={<LineChartIcon />}
            title="Not enough history yet"
            description="Performance history builds daily as you use Basis — check back tomorrow for your first chart."
            className="h-64 border-0"
          />
        )}
      </CardContent>
    </Card>
  );
}

function Dash() {
  return <span className="text-ink-faint">—</span>;
}

function PositionsCard({ data }: { data: DashboardPayload }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Your positions snapshot</CardTitle>
          <p className="mt-0.5 text-xs text-ink-muted">
            Top {data.positions.length} of {data.positionCount} by market value
          </p>
        </div>
        <CardLink href="/portfolio">View portfolio</CardLink>
      </CardHeader>
      <CardContent className="p-0">
        {data.positions.length === 0 ? (
          <EmptyState
            title="No positions yet"
            description="Place your first paper trade to start building a portfolio."
            action={<CardLink href="/trade">Go to paper trading</CardLink>}
            className="m-4"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Day</TableHead>
                <TableHead className="text-right">Unrealized P/L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.positions.map((p) => (
                <TableRow key={p.symbol}>
                  <TableCell>
                    <Link
                      href={`/research/${p.symbol}`}
                      className="font-medium transition-colors hover:text-brand"
                    >
                      {p.symbol}
                    </Link>
                  </TableCell>
                  <TableCell className="tnum text-right">
                    {p.marketValueCents != null ? fmtCents(p.marketValueCents) : <Dash />}
                  </TableCell>
                  <TableCell className="tnum text-right">
                    {p.dayChangeCents != null && p.dayChangePct != null ? (
                      <span className="inline-flex items-center gap-2">
                        <MoneyDelta cents={p.dayChangeCents} className="text-xs" />
                        <PctDelta value={p.dayChangePct} className="text-xs" />
                      </span>
                    ) : (
                      <Dash />
                    )}
                  </TableCell>
                  <TableCell className="tnum text-right">
                    {p.unrealizedPnlCents != null ? (
                      <span className="inline-flex items-center gap-2">
                        <MoneyDelta cents={p.unrealizedPnlCents} className="text-xs" />
                        {p.unrealizedPnlPct != null && (
                          <PctDelta value={p.unrealizedPnlPct} className="text-xs" />
                        )}
                      </span>
                    ) : (
                      <Dash />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function RecentTradesCard({ data }: { data: DashboardPayload }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Recent trades</CardTitle>
          <p className="mt-0.5 text-xs text-ink-muted">
            {data.openOrdersCount} open {data.openOrdersCount === 1 ? "order" : "orders"}
          </p>
        </div>
        <CardLink href="/trade">Trade</CardLink>
      </CardHeader>
      <CardContent className={data.recentTrades.length === 0 ? undefined : "p-2"}>
        {data.recentTrades.length === 0 ? (
          <EmptyState
            icon={<ReceiptTextIcon />}
            title="No trades yet"
            description="Fills from your paper orders will show up here."
            action={<CardLink href="/trade">Place an order</CardLink>}
          />
        ) : (
          <ul>
            {data.recentTrades.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/research/${t.symbol}`}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-panel-2/60"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Badge
                      variant={t.side === "buy" ? "pos" : "neg"}
                      className="w-10 justify-center"
                    >
                      {t.side === "buy" ? "Buy" : "Sell"}
                    </Badge>
                    <span className="text-sm font-medium">{t.symbol}</span>
                    <span className="tnum truncate text-xs text-ink-muted">
                      {fmtQtyE4(t.qtyE4)} @ {fmtCents(t.priceCents, { precise: true })}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-ink-faint">
                    {relativeTime(t.executedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function MarketPulseCard({ data }: { data: DashboardPayload }) {
  const { indexes, movers } = data;
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Market pulse</CardTitle>
        <CardLink href="/markets">Markets</CardLink>
      </CardHeader>
      <CardContent className="space-y-3">
        {indexes.length > 0 ? (
          <div>
            {indexes.map((q) => (
              <QuoteRow key={q.symbol} quote={q} label={INDEX_LABELS[q.symbol]} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink-muted">Index quotes are unavailable right now.</p>
        )}
        <Separator />
        <div>
          <MicroLabel className="mb-1">Top gainers</MicroLabel>
          {movers.gainers.slice(0, 3).map((m) => (
            <QuoteRow
              key={m.symbol}
              quote={{
                symbol: m.symbol,
                priceCents: m.priceCents,
                changePct: m.changePct,
                changeCents: 0,
                synthetic: m.synthetic,
                stale: false,
                asOf: 0,
              }}
            />
          ))}
        </div>
        <div>
          <MicroLabel className="mb-1">Top losers</MicroLabel>
          {movers.losers.slice(0, 3).map((m) => (
            <QuoteRow
              key={m.symbol}
              quote={{
                symbol: m.symbol,
                priceCents: m.priceCents,
                changePct: m.changePct,
                changeCents: 0,
                synthetic: m.synthetic,
                stale: false,
                asOf: 0,
              }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WatchlistMoversCard({ data }: { data: DashboardPayload }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Watchlist movers</CardTitle>
        <CardLink href="/watchlists">Watchlists</CardLink>
      </CardHeader>
      <CardContent>
        {data.watchlistMovers.length === 0 ? (
          <EmptyState
            icon={<ListIcon />}
            title="Nothing on your watchlists"
            description="Add symbols to a watchlist to track their daily moves here."
            action={<CardLink href="/watchlists">Build a watchlist</CardLink>}
          />
        ) : (
          <div>
            {data.watchlistMovers.map((q) => (
              <QuoteRow key={q.symbol} quote={q} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AlertsCard({ data }: { data: DashboardPayload }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle>Alerts</CardTitle>
          <Badge variant="secondary">{data.alertsEnabledCount} enabled</Badge>
        </div>
        <CardLink href="/alerts">Manage</CardLink>
      </CardHeader>
      <CardContent>
        {data.alertNotifications.length === 0 ? (
          <EmptyState
            icon={<BellIcon />}
            title="No triggered alerts"
            description={
              data.alertsEnabledCount > 0
                ? "Your alert rules are armed — triggers will appear here."
                : "Create alert rules to get notified about price and indicator moves."
            }
            action={<CardLink href="/alerts">Set up alerts</CardLink>}
          />
        ) : (
          <ul className="space-y-1">
            {data.alertNotifications.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.href ?? "/alerts"}
                  className="-mx-2 block rounded-md px-2 py-1.5 transition-colors hover:bg-panel-2/60"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{n.title}</span>
                    <span className="shrink-0 text-xs text-ink-faint">
                      {relativeTime(n.createdAt)}
                    </span>
                  </span>
                  {n.body && (
                    <span className="mt-0.5 block truncate text-xs text-ink-muted">{n.body}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ── skeleton (mirrors the final layout) ─────────────────────────────

function RowSkeletons({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2.5 h-7 w-28" />
              <Skeleton className="mt-2 h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent>
              <RowSkeletons count={5} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <RowSkeletons count={4} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent>
                <RowSkeletons count={4} />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── page component ──────────────────────────────────────────────────

export function DashboardClient({ username }: { username: string }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<DashboardPayload>("/api/dashboard"),
    refetchInterval: 30_000,
  });

  const now = new Date();

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight" suppressHydrationWarning>
            {greetingForHour(now.getHours())}, {username}
          </h1>
          <p className="mt-0.5 text-xs text-ink-muted" suppressHydrationWarning>
            {now.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            {" · Paper portfolio overview"}
          </p>
        </div>
        {data?.demoMode && (
          <span className="flex items-center gap-2 text-xs text-ink-muted">
            <ActivityIcon className="size-4 text-ink-faint" />
            Demo mode
            <SourceBadge synthetic />
          </span>
        )}
      </div>

      {isPending ? (
        <DashboardSkeleton />
      ) : isError || !data ? (
        <ErrorState
          title="Couldn't load your dashboard"
          description="Something went wrong while assembling your overview."
          retry={() => void refetch()}
        />
      ) : (
        <div className="space-y-4">
          <HeroStrip data={data} />
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="space-y-4 xl:col-span-2">
              <PerformanceCard data={data} />
              <PositionsCard data={data} />
              <RecentTradesCard data={data} />
            </div>
            <div className="space-y-4">
              <MarketPulseCard data={data} />
              <WatchlistMoversCard data={data} />
              <AlertsCard data={data} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
