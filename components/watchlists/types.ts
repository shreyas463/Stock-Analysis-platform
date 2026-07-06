import type { Quote } from "@/lib/market-data/types";

export type WatchlistItem = {
  id: string;
  watchlistId: string;
  symbol: string;
  note: string | null;
  tags: string[] | null;
  targetEntryCents: number | null;
  targetExitCents: number | null;
  sortOrder: number;
  createdAt: number;
  quote: Quote | null;
  name: string | null;
};

export type Watchlist = {
  id: string;
  userId: string;
  name: string;
  sortOrder: number;
  createdAt: number;
  items: WatchlistItem[];
};

export type WatchlistsResponse = { watchlists: Watchlist[] };
