"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon, XIcon } from "lucide-react";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { SearchPayload } from "@/components/news/types";

function useDebounced(value: string, delayMs: number): string {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/** Debounced /api/search combobox for filtering news by symbol. */
export function SymbolFilter({
  symbol,
  onSelect,
  onClear,
}: {
  symbol: string | null;
  onSelect: (symbol: string) => void;
  onClear: () => void;
}) {
  const [text, setText] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const debounced = useDebounced(text.trim(), 250);

  const search = useQuery({
    queryKey: ["news-symbol-search", debounced],
    queryFn: () => api<SearchPayload>(`/api/search?q=${encodeURIComponent(debounced)}`),
    enabled: debounced.length > 0,
    staleTime: 60_000,
  });

  const results = (search.data?.results ?? []).slice(0, 8);

  React.useEffect(() => setHighlighted(0), [debounced]);

  // Close on outside click.
  React.useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function select(sym: string) {
    onSelect(sym);
    setText("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = results[highlighted];
      if (hit) select(hit.symbol);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {symbol && (
        <Badge variant="default" className="gap-1.5 py-1">
          {symbol}
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear ${symbol} filter`}
            className="rounded-sm transition-colors hover:text-brand-strong"
          >
            <XIcon className="size-3" />
          </button>
        </Badge>
      )}
      <div ref={rootRef} className="relative w-full sm:w-72">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        <Input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Filter by symbol…"
          className="pl-8"
          role="combobox"
          aria-expanded={open && debounced.length > 0}
          aria-label="Filter news by symbol"
          aria-autocomplete="list"
        />
        {open && debounced.length > 0 && (
          <div
            role="listbox"
            className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-line bg-panel shadow-md"
          >
            {search.isPending ? (
              <p className="px-3 py-2 text-xs text-ink-muted">Searching…</p>
            ) : search.isError ? (
              <p className="px-3 py-2 text-xs text-ink-muted">Search failed — try again.</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-2 text-xs text-ink-muted">No symbols match “{debounced}”.</p>
            ) : (
              results.map((r, i) => (
                <button
                  key={`${r.symbol}-${r.exchange ?? ""}`}
                  type="button"
                  role="option"
                  aria-selected={i === highlighted}
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => select(r.symbol)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                    i === highlighted ? "bg-panel-2" : "hover:bg-panel-2/60",
                  )}
                >
                  <span className="w-16 shrink-0 font-medium">{r.symbol}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-ink-muted">{r.name}</span>
                  {r.exchange && (
                    <span className="shrink-0 text-[11px] uppercase tracking-wide text-ink-faint">
                      {r.exchange}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
