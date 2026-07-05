"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, Money, PctDelta, SourceBadge } from "@/components/format";
import { useUniverseQuotes } from "@/components/markets/use-universe";
import type { UniverseQuoteLite, UniverseStatic } from "@/components/markets/types";

type SortKey = "symbol" | "price" | "changePct" | "sector";
type SortDir = "asc" | "desc";

const SORT_DEFAULT_DIR: Record<SortKey, SortDir> = {
  symbol: "asc",
  sector: "asc",
  price: "desc",
  changePct: "desc",
};

function SortHeader({
  label,
  sortKey,
  active,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const Icon = active ? (dir === "asc" ? ArrowUpIcon : ArrowDownIcon) : ArrowUpDownIcon;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-ink",
          active ? "text-ink" : "text-ink-faint",
        )}
        aria-label={`Sort by ${label}`}
      >
        {label}
        <Icon className="size-3" />
      </button>
    </TableHead>
  );
}

export function UniverseTable({ universe }: { universe: UniverseStatic[] }) {
  const { data, isPending, isError, refetch } = useUniverseQuotes();
  const [filter, setFilter] = React.useState("");
  const [sector, setSector] = React.useState<string | null>(null);
  const [sortKey, setSortKey] = React.useState<SortKey>("symbol");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");

  const quotesBySymbol = React.useMemo(() => {
    const map = new Map<string, UniverseQuoteLite | null>();
    for (const row of data?.rows ?? []) map.set(row.symbol, row.quote);
    return map;
  }, [data]);

  const sectors = React.useMemo(
    () => [...new Set(universe.map((u) => u.sector))].sort((a, b) => a.localeCompare(b)),
    [universe],
  );

  function onSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(SORT_DEFAULT_DIR[key]);
    }
  }

  const rows = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = universe.filter((u) => {
      if (sector && u.sector !== sector) return false;
      if (!q) return true;
      return u.symbol.toLowerCase().includes(q) || u.name.toLowerCase().includes(q);
    });
    const dir = sortDir === "asc" ? 1 : -1;
    const num = (v: number | null | undefined) => v ?? (sortDir === "asc" ? Infinity : -Infinity);
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "symbol":
          return dir * a.symbol.localeCompare(b.symbol);
        case "sector":
          return dir * (a.sector.localeCompare(b.sector) || a.symbol.localeCompare(b.symbol));
        case "price":
          return (
            dir *
            (num(quotesBySymbol.get(a.symbol)?.priceCents) -
              num(quotesBySymbol.get(b.symbol)?.priceCents))
          );
        case "changePct":
          return (
            dir *
            (num(quotesBySymbol.get(a.symbol)?.changePct) -
              num(quotesBySymbol.get(b.symbol)?.changePct))
          );
      }
    });
  }, [universe, filter, sector, sortKey, sortDir, quotesBySymbol]);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Coverage universe</CardTitle>
            <p className="mt-0.5 text-xs text-ink-muted">
              {universe.length} symbols with live quotes
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by symbol or name…"
              className="pl-8"
              aria-label="Filter universe by symbol or name"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSector(null)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              sector === null
                ? "border-transparent bg-brand-soft text-brand"
                : "border-line text-ink-muted hover:bg-panel-2 hover:text-ink",
            )}
          >
            All sectors
          </button>
          {sectors.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSector((cur) => (cur === s ? null : s))}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                sector === s
                  ? "border-transparent bg-brand-soft text-brand"
                  : "border-line text-ink-muted hover:bg-panel-2 hover:text-ink",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isError && (
          <div className="flex items-center justify-between gap-3 border-b border-line bg-warn-soft/50 px-4 py-2">
            <p className="text-xs text-ink-muted">
              Live quotes are unavailable right now — showing the static universe.
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        )}
        {rows.length === 0 ? (
          <EmptyState
            title="No symbols match your filters"
            description="Try a different search term or clear the sector filter."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFilter("");
                  setSector(null);
                }}
              >
                Clear filters
              </Button>
            }
            className="m-4"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortHeader
                  label="Symbol"
                  sortKey="symbol"
                  active={sortKey === "symbol"}
                  dir={sortDir}
                  onSort={onSort}
                />
                <TableHead>Name</TableHead>
                <SortHeader
                  label="Price"
                  sortKey="price"
                  active={sortKey === "price"}
                  dir={sortDir}
                  onSort={onSort}
                  className="text-right [&>button]:justify-end"
                />
                <SortHeader
                  label="Day %"
                  sortKey="changePct"
                  active={sortKey === "changePct"}
                  dir={sortDir}
                  onSort={onSort}
                  className="text-right"
                />
                <SortHeader
                  label="Sector"
                  sortKey="sector"
                  active={sortKey === "sector"}
                  dir={sortDir}
                  onSort={onSort}
                  className="hidden md:table-cell"
                />
                <TableHead className="hidden lg:table-cell">Exchange</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => {
                const quote = quotesBySymbol.get(u.symbol) ?? null;
                return (
                  <TableRow key={u.symbol}>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        <Link
                          href={`/research/${u.symbol}`}
                          className="font-medium transition-colors hover:text-brand"
                        >
                          {u.symbol}
                        </Link>
                        {u.etf && <Badge variant="outline">ETF</Badge>}
                        {quote && (quote.synthetic || quote.stale) && (
                          <SourceBadge
                            synthetic={quote.synthetic}
                            stale={quote.stale}
                            asOf={quote.asOf}
                          />
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-xs text-ink-muted">
                      {u.name}
                    </TableCell>
                    <TableCell className="tnum text-right">
                      {isPending ? (
                        <Skeleton className="ml-auto h-4 w-16" />
                      ) : quote ? (
                        <Money cents={quote.priceCents} />
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </TableCell>
                    <TableCell className="tnum text-right">
                      {isPending ? (
                        <Skeleton className="ml-auto h-4 w-12" />
                      ) : quote ? (
                        <PctDelta value={quote.changePct} />
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-xs text-ink-muted md:table-cell">
                      {u.sector}
                    </TableCell>
                    <TableCell className="hidden text-xs text-ink-faint lg:table-cell">
                      {u.exchange}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <p className="border-t border-line px-4 py-2.5 text-xs text-ink-faint">
          Coverage is a fixed {universe.length}-symbol universe in demo mode.
        </p>
      </CardContent>
    </Card>
  );
}
