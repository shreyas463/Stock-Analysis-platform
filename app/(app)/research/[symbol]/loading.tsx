import { Skeleton } from "@/components/ui/skeleton";

export default function StockLoading() {
  return (
    <div className="space-y-5">
      {/* Header: symbol + name + badges, price line, actions */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-3.5 w-28" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Chart card: controls row, readout, plot area */}
      <div className="rounded-lg border border-line bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1.5">
            <Skeleton className="h-7 w-16" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-9" />
            ))}
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-16" />
            ))}
          </div>
        </div>
        <Skeleton className="mt-3 h-4 w-2/3" />
        <Skeleton className="mt-2 h-[380px] w-full" />
      </div>

      {/* Tabs + overview-shaped content */}
      <div>
        <Skeleton className="h-9 w-72" />
        <div className="mt-3 grid gap-4 xl:grid-cols-3">
          <div className="rounded-lg border border-line bg-panel xl:col-span-2">
            <div className="border-b border-line px-4 py-3">
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 p-4 md:grid-cols-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-line bg-panel">
            <div className="border-b border-line px-4 py-3">
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="space-y-2.5 p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
