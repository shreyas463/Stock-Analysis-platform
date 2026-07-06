import { Skeleton } from "@/components/ui/skeleton";
import { PortfolioSkeleton } from "@/components/portfolio/portfolio-skeleton";

export default function PortfolioLoading() {
  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <PortfolioSkeleton />
    </div>
  );
}
