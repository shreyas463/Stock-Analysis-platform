"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";
import type { UniversePayload } from "@/components/markets/types";

/** Shared quotes-for-the-universe query (deduped across markets components). */
export function useUniverseQuotes() {
  return useQuery({
    queryKey: ["market-universe"],
    queryFn: () => api<UniversePayload>("/api/market/universe"),
    refetchInterval: 30_000,
  });
}
