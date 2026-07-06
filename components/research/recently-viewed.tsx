"use client";

import * as React from "react";
import Link from "next/link";
import { History, X } from "lucide-react";
import { clearRecent, readRecent, type RecentSymbol } from "./recent";

/** "Recently viewed" chips on the research landing page. */
export function RecentlyViewed() {
  const [items, setItems] = React.useState<RecentSymbol[] | null>(null);

  React.useEffect(() => {
    setItems(readRecent());
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <section aria-label="Recently viewed symbols" className="space-y-2">
      <div className="flex items-center gap-2">
        <History className="size-3.5 text-ink-faint" aria-hidden />
        <h2 className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
          Recently viewed
        </h2>
        <button
          type="button"
          onClick={() => {
            clearRecent();
            setItems([]);
          }}
          className="ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-ink-faint transition-colors hover:bg-panel-2 hover:text-ink"
        >
          <X className="size-3" aria-hidden />
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.symbol}
            href={`/research/${item.symbol}`}
            className="group inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-xs transition-colors hover:border-line-strong hover:bg-panel-2/60"
          >
            <span className="font-mono font-semibold text-brand">{item.symbol}</span>
            {item.name && (
              <span className="max-w-40 truncate text-ink-muted group-hover:text-ink">
                {item.name}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
