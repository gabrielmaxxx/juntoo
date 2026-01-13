import { Skeleton } from "@/components/ui/skeleton";
import { EventCardSkeleton } from "./EventCardSkeleton";

export const HomePageSkeleton = () => {
  return (
    <div className="space-y-6 pb-24">
      {/* Greeting skeleton */}
      <header className="px-4 pt-6 text-center space-y-2">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-5 w-56 mx-auto" />
      </header>

      {/* Daily mission skeleton */}
      <section className="px-4">
        <div className="rounded-2xl p-6 bg-muted">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="w-14 h-14 rounded-full" />
          </div>
        </div>
      </section>

      {/* Trending events skeleton */}
      <section>
        <div className="px-4 mb-3">
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 px-4 pb-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-64">
                <Skeleton className="w-full h-36 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Friends events skeleton */}
      <section className="px-4 space-y-3">
        <Skeleton className="h-6 w-36" />
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="w-full h-40 rounded-xl" />
        ))}
      </section>

      {/* Recommended events skeleton */}
      <section className="px-4 space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-36" />
        </div>
        {[...Array(3)].map((_, i) => (
          <EventCardSkeleton key={i} variant="compact" />
        ))}
      </section>
    </div>
  );
};
