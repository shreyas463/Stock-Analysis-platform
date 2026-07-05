"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2Icon, SearchIcon } from "lucide-react";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type SearchResult = { symbol: string; name: string; exchange: string | null; type: string };

/**
 * Debounced, keyboard-navigable symbol search backed by /api/search.
 * Shows "SYMBOL — Company Name" rows; Enter/click selects.
 */
export function SymbolCombobox({
  value,
  onSelect,
  placeholder = "Search symbol or company…",
  id,
  autoFocus,
  className,
  disabled,
}: {
  value: string | null;
  onSelect: (symbol: string, name: string | null) => void;
  placeholder?: string;
  id?: string;
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [highlight, setHighlight] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching, isError } = useQuery({
    queryKey: ["symbol-search", debounced],
    queryFn: () =>
      api<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(debounced)}`),
    enabled: open && debounced.length > 0,
    staleTime: 60_000,
  });
  const results = React.useMemo(() => (data?.results ?? []).slice(0, 8), [data]);

  React.useEffect(() => {
    setHighlight(0);
  }, [debounced]);

  // Close on outside click.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function pick(r: SearchResult) {
    onSelect(r.symbol, r.name || null);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      const r = results[highlight];
      if (open && r) {
        e.preventDefault();
        pick(r);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        {isFetching && (
          <Loader2Icon className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-faint" />
        )}
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
          className="pl-8"
          placeholder={value ?? placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query.trim() && setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && debounced.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-line bg-panel py-1 shadow-md"
        >
          {isError && (
            <li className="px-3 py-2 text-xs text-ink-muted">Search failed — try again.</li>
          )}
          {!isError && results.length === 0 && !isFetching && (
            <li className="px-3 py-2 text-xs text-ink-muted">No matches for “{debounced}”.</li>
          )}
          {results.map((r, i) => (
            <li
              key={`${r.symbol}-${i}`}
              role="option"
              aria-selected={i === highlight}
              className={cn(
                "flex cursor-pointer items-baseline gap-2 px-3 py-1.5 text-sm transition-colors",
                i === highlight ? "bg-panel-2 text-ink" : "text-ink-muted",
              )}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(r);
              }}
            >
              <span className="font-mono text-xs font-semibold text-ink">{r.symbol}</span>
              <span className="min-w-0 flex-1 truncate text-xs">{r.name}</span>
              {r.exchange && (
                <span className="text-[10px] uppercase tracking-wide text-ink-faint">
                  {r.exchange}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
