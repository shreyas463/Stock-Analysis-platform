"use client";

import Link from "next/link";
import { BriefcaseIcon } from "lucide-react";
import type { PortfolioOverview } from "@/lib/services/portfolio";
import { fmtCents, fmtPct, fmtQtyE4 } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, MoneyDelta, PctDelta } from "@/components/format";

const dash = <span className="text-ink-faint">—</span>;

export function PositionsTable({ overview }: { overview: PortfolioOverview }) {
  const positions = overview.positions;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Positions</CardTitle>
          <CardDescription>Average-cost basis · paper portfolio</CardDescription>
        </div>
        <span className="text-xs tnum text-ink-muted">
          {positions.length} {positions.length === 1 ? "holding" : "holdings"}
        </span>
      </CardHeader>
      <CardContent className="p-0">
        {positions.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<BriefcaseIcon />}
              title="No positions yet"
              description="Place a paper trade to start building your portfolio — you have simulated cash ready to go."
              action={
                <Button asChild size="sm">
                  <Link href="/trade">Place your first trade</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Avg cost</TableHead>
                <TableHead className="text-right">Last</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Day Δ</TableHead>
                <TableHead className="text-right">Unrealized P/L</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead className="text-right">Realized P/L</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((p) => {
                const noData = p.lastPriceCents === null;
                return (
                  <TableRow key={p.symbol}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/research/${p.symbol}`}
                          className="font-mono text-xs font-semibold text-ink transition-colors hover:text-brand"
                        >
                          {p.symbol}
                        </Link>
                        {noData && <Badge variant="warn">no data</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tnum">{fmtQtyE4(p.qtyE4)}</TableCell>
                    <TableCell className="text-right tnum">
                      {fmtCents(p.avgCostCents, { precise: true })}
                    </TableCell>
                    <TableCell className="text-right tnum">
                      {p.lastPriceCents === null
                        ? dash
                        : fmtCents(p.lastPriceCents, { precise: true })}
                    </TableCell>
                    <TableCell className="text-right tnum font-medium">
                      {p.marketValueCents === null ? dash : fmtCents(p.marketValueCents)}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.dayChangeCents === null ? (
                        dash
                      ) : (
                        <span className="inline-flex flex-col items-end leading-tight">
                          <MoneyDelta cents={p.dayChangeCents} className="text-xs" />
                          {p.dayChangePct !== null && (
                            <PctDelta value={p.dayChangePct} className="text-[11px]" />
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.unrealizedPnlCents === null ? (
                        dash
                      ) : (
                        <span className="inline-flex flex-col items-end leading-tight">
                          <MoneyDelta cents={p.unrealizedPnlCents} className="text-xs" />
                          {p.unrealizedPnlPct !== null && (
                            <PctDelta value={p.unrealizedPnlPct} className="text-[11px]" />
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.weight === null ? (
                        dash
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="h-1 w-16 overflow-hidden rounded-full bg-panel-2">
                            <div
                              className="h-full rounded-full bg-brand"
                              style={{ width: `${Math.min(p.weight * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs tnum text-ink-muted">
                            {fmtPct(p.weight, { digits: 1 })}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.realizedPnlCents === 0 ? (
                        dash
                      ) : (
                        <MoneyDelta cents={p.realizedPnlCents} className="text-xs" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/trade?symbol=${p.symbol}`}>Trade</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="border-t border-line-strong font-medium hover:bg-transparent">
                <TableCell className="text-xs uppercase tracking-wide text-ink-faint">
                  Total
                </TableCell>
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell className="text-right tnum">
                  {fmtCents(overview.positionsValueCents)}
                </TableCell>
                <TableCell className="text-right">
                  <MoneyDelta cents={overview.dayChangeCents} className="text-xs" />
                </TableCell>
                <TableCell className="text-right">
                  <MoneyDelta cents={overview.unrealizedPnlCents} className="text-xs" />
                </TableCell>
                <TableCell />
                <TableCell className="text-right">
                  <MoneyDelta cents={overview.realizedPnlCents} className="text-xs" />
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
