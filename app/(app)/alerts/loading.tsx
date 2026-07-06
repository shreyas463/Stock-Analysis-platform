import { Skeleton } from "@/components/ui/skeleton";
import { AlertsSkeleton } from "@/components/alerts/alerts-view";

export default function AlertsLoading() {
  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-3 w-96" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <AlertsSkeleton />
    </div>
  );
}
