import { Skeleton } from "@/components/ui/skeleton";
import { WatchlistsSkeleton } from "@/components/watchlists/watchlists-view";

export default function WatchlistsLoading() {
  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <WatchlistsSkeleton />
    </div>
  );
}
