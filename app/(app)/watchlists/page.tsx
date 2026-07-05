import type { Metadata } from "next";
import { WatchlistsView } from "@/components/watchlists/watchlists-view";

export const metadata: Metadata = { title: "Watchlists · Basis" };

export default function WatchlistsPage() {
  return <WatchlistsView />;
}
