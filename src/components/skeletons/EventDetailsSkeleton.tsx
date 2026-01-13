import { Skeleton } from "@/components/ui/skeleton";

export const EventDetailsSkeleton = () => {
  return (
    <div className="pb-24 bg-background min-h-screen">
      {/* Hero skeleton */}
      <div className="relative h-64">
        <Skeleton className="w-full h-full" />
        <div className="absolute top-4 left-4 right-4 flex justify-between">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-4 space-y-6">
        {/* Info section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>

          <Skeleton className="h-20 w-full" />
        </div>

        {/* Participants skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <div className="flex -space-x-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-10 rounded-full border-2 border-background" />
            ))}
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>

        {/* Reviews skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-6 w-24" />
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3 mb-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, j) => (
                        <Skeleton key={j} className="h-3 w-3" />
                      ))}
                    </div>
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Action button skeleton */}
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
};
