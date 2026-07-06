import { Skeleton } from "@/components/ui/skeleton";

export default function ResearchLoading() {
  return (
    <div className="space-y-8">
      {/* PageHeader */}
      <div className="mb-5 space-y-1.5">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-3.5 w-80" />
      </div>

      {/* Hero search */}
      <div className="py-4 md:py-8">
        <div className="mx-auto max-w-xl space-y-3">
          <Skeleton className="mx-auto h-7 w-44" />
          <Skeleton className="mx-auto h-4 w-72" />
          <Skeleton className="mt-5 h-12 w-full rounded-lg" />
        </div>
      </div>

      {/* Sector sections */}
      <div className="space-y-6">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-72" />
        </div>
        {Array.from({ length: 3 }).map((_, s) => (
          <div key={s} className="space-y-2.5">
            <Skeleton className="h-3 w-24" />
            <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-md border border-line bg-panel p-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-14" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="mt-2 h-3.5 w-3/4" />
                  <Skeleton className="mt-1.5 h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
