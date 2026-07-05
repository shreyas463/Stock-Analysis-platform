"use client";

import { useQuery } from "@tanstack/react-query";
import type { PortfolioOverview } from "@/lib/services/portfolio";
import { api } from "@/lib/client";
import { fmtCents } from "@/lib/money";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState, Money, MoneyDelta, PctDelta, SourceBadge } from "@/components/format";
import { PageHeader } from "@/components/page-header";
import { DepositDialog } from "./deposit-dialog";
import { OrdersPanel } from "./orders-panel";
import { PerformanceChart } from "./performance-chart";
import { PortfolioSkeleton } from "./portfolio-skeleton";
import { PositionsTable } from "./positions-table";

function StatCard({
  label,
  children,
  caption,
}: {
  label: string;
  children: React.ReactNode;
  caption?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</p>
        <div className="mt-1 text-2xl font-semibold tracking-tight tnum">{children}</div>
        {caption && <div className="mt-1 text-xs text-ink-muted">{caption}</div>}
      </CardContent>
    </Card>
  );
}

export function PortfolioView() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["portfolio"],
    queryFn: () => api<PortfolioOverview>("/api/portfolio"),
    refetchInterval: 60_000,
  });

  return (
    <div>
      <PageHeader
        title="Portfolio"
        description="Your paper portfolio — simulated fills at market prices."
        actions={<DepositDialog />}
      />
      {isPending ? (
        <PortfolioSkeleton />
      ) : isError ? (
        <ErrorState
          title="Couldn't load your portfolio"
          description="Something went wrong while fetching portfolio data."
          retry={() => refetch()}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Total value"
              caption={
                <span className="flex items-center gap-1.5">
                  as of{" "}
                  {new Date(data.asOf).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  <SourceBadge
                    synthetic={data.anySynthetic}
                    stale={data.anyStale}
                    asOf={data.asOf}
                  />
                </span>
              }
            >
              <Money cents={data.totalValueCents} />
            </StatCard>
            <StatCard label="Day change" caption={<PctDelta value={data.dayChangePct} />}>
              <MoneyDelta cents={data.dayChangeCents} />
            </StatCard>
            <StatCard
              label="Total return"
              caption={
                <span className="flex items-center gap-1.5">
                  <PctDelta value={data.totalReturnPct} />
                  <span>vs {fmtCents(data.totalDepositsCents)} deposited</span>
                </span>
              }
            >
              <MoneyDelta cents={data.totalReturnCents} />
            </StatCard>
            <StatCard
              label="Paper cash"
              caption={<span className="tnum">Buying power {fmtCents(data.buyingPowerCents)}</span>}
            >
              <Money cents={data.cashCents} />
            </StatCard>
            <StatCard
              label="Profit / loss"
              caption={
                <span className="flex items-center gap-1.5">
                  <span>Realized</span>
                  <MoneyDelta cents={data.realizedPnlCents} className="text-xs" />
                </span>
              }
            >
              <MoneyDelta cents={data.unrealizedPnlCents} />
            </StatCard>
          </div>

          <PerformanceChart />
          <PositionsTable overview={data} />
          <OrdersPanel />
        </div>
      )}
    </div>
  );
}
