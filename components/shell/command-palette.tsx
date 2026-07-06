"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { api } from "@/lib/client";
import { NAV_SECTIONS } from "@/components/shell/sidebar";
import type { SearchResult } from "@/lib/market-data/types";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const { data: results } = useQuery({
    queryKey: ["symbol-search", query],
    queryFn: () => api<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(query)}`),
    enabled: open && query.trim().length >= 1,
    staleTime: 60_000,
  });

  function go(href: string) {
    onOpenChange(false);
    setQuery("");
    router.push(href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh]"
      onClick={() => onOpenChange(false)}
    >
      <Command
        label="Command palette"
        shouldFilter={query.trim().length < 1 || !results?.results?.length}
        className="w-full max-w-lg overflow-hidden rounded-lg border border-line bg-panel shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <SearchIcon className="size-4 shrink-0 text-ink-faint" />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Search stocks or jump to a page…"
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-ink-faint"
          />
          <kbd className="rounded border border-line bg-panel-2 px-1.5 py-0.5 text-[10px] text-ink-faint">
            esc
          </kbd>
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
          <Command.Empty className="py-6 text-center text-sm text-ink-muted">
            No results found.
          </Command.Empty>

          {results?.results && results.results.length > 0 && (
            <Command.Group
              heading="Stocks"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-ink-faint"
            >
              {results.results.map((r) => (
                <Command.Item
                  key={r.symbol}
                  value={`${r.symbol} ${r.name}`}
                  onSelect={() => go(`/research/${r.symbol}`)}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-panel-2"
                >
                  <span className="w-14 shrink-0 font-mono text-xs font-semibold text-brand">
                    {r.symbol}
                  </span>
                  <span className="truncate text-ink">{r.name}</span>
                  <span className="ml-auto text-[10px] text-ink-faint">{r.type}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          <Command.Group
            heading="Navigate"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-ink-faint"
          >
            {NAV_SECTIONS.flatMap((s) => s.items).map((item) => (
              <Command.Item
                key={item.href}
                value={`go ${item.label}`}
                onSelect={() => go(item.href)}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-panel-2"
              >
                <item.icon className="size-4 text-ink-muted" />
                {item.label}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
