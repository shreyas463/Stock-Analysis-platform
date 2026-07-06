import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewsLoading() {
  return (
    <div>
      <div className="mb-5">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="mt-1.5 h-3 w-72" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-9 w-full sm:w-72" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <div className="flex gap-3 p-4">
                <Skeleton className="h-16 w-24 shrink-0 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
