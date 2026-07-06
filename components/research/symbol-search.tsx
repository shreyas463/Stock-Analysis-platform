"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CornerDownLeft, Loader2, Search } from "lucide-react";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/lib/market-data/types";

const DEBOUNCE_MS = 250;

/**
 * Hero symbol search: debounced /api/search lookups with a keyboard-navigable
 * (ArrowUp/Down, Enter, Escape) results listbox.
 */
export function SymbolSearch() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [navigating, setNavigating] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const listRef = React.useRef<HTMLUListElement | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const enabled = debounced.length > 0;
  const { data, isFetching, error } = useQuery({
    queryKey: ["symbol-search", debounced],
    queryFn: () =>
      api<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(debounced)}`),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const results = React.useMemo(() => (data?.results ?? []).slice(0, 8), [data]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [debounced, results.length]);

  const go = React.useCallback(
    (symbol: string) => {
      setNavigating(symbol);
      setOpen(false);
      router.push(`/research/${encodeURIComponent(symbol)}`);
    },
    [router],
  );

  const showPanel = open && enabled;

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!showPanel || results.length === 0) {
      if (e.key === "Enter" && query.trim()) {
        // Direct entry: let the stock page validate the symbol.
        e.preventDefault();
        go(query.trim().toUpperCase());
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[activeIndex] ?? results[0];
      if (target) go(target.symbol);
    }
  }

  // Keep the active option scrolled into view.
  React.useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`#symbol-option-${activeIndex}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <label htmlFor="symbol-search" className="sr-only">
        Search stocks by symbol or company name
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
          aria-hidden
        />
        <input
          ref={inputRef}
          id="symbol-search"
          type="text"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="symbol-search-listbox"
          aria-activedescendant={
            showPanel && results.length > 0 ? `symbol-option-${activeIndex}` : undefined
          }
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search symbols or companies — try AAPL, Nvidia, SPY…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="h-12 w-full rounded-lg border border-line bg-panel pl-10 pr-10 text-sm text-ink shadow-xs transition-colors placeholder:text-ink-faint focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-focus"
        />
        {(isFetching || navigating) && (
          <Loader2
            className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-faint"
            aria-hidden
          />
        )}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-lg border border-line bg-panel shadow-md">
          {error ? (
            <p className="px-4 py-3 text-xs text-ink-muted">
              Search is unavailable right now — try again in a moment.
            </p>
          ) : results.length > 0 ? (
            <ul
              ref={listRef}
              id="symbol-search-listbox"
              role="listbox"
              aria-label="Symbol search results"
              className="max-h-80 overflow-y-auto p-1"
            >
              {results.map((r, i) => (
                <li
                  key={`${r.symbol}-${r.exchange ?? ""}`}
                  id={`symbol-option-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  // preventDefault keeps input focus so blur doesn't close before click.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(r.symbol)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors",
                    i === activeIndex ? "bg-panel-2" : "hover:bg-panel-2/60",
                  )}
                >
                  <span className="w-16 shrink-0 font-mono text-sm font-semibold text-brand">
                    {r.symbol}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{r.name}</span>
                  <span className="hidden shrink-0 text-[11px] uppercase tracking-wide text-ink-faint sm:block">
                    {r.exchange ?? r.type}
                  </span>
                  {i === activeIndex && (
                    <CornerDownLeft className="size-3.5 shrink-0 text-ink-faint" aria-hidden />
                  )}
                </li>
              ))}
            </ul>
          ) : !isFetching ? (
            <p className="px-4 py-3 text-xs text-ink-muted">
              No matches for “{debounced}”. Try a ticker symbol like MSFT or a company name.
            </p>
          ) : (
            <p className="px-4 py-3 text-xs text-ink-muted">Searching…</p>
          )}
        </div>
      )}
    </div>
  );
}
