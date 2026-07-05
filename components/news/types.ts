import type { NewsItem, SearchResult } from "@/lib/market-data/types";

export type NewsPayload = { demo: boolean; items: NewsItem[] };
export type SearchPayload = { results: SearchResult[] };
export type { NewsItem, SearchResult };
