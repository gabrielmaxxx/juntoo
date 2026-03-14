import { Skeleton } from "@/components/ui/skeleton";

export const HomePageSkeleton = () => {
  return (
    <div className="space-y-8 pb-28">
      {/* Greeting */}
      <header className="px-5 pt-8 text-center space-y-2">
        <Skeleton className="h-7 w-44 mx-auto rounded-lg" />
        <Skeleton className="h-4 w-48 mx-auto rounded-lg" />
      </header>

      {/* Daily mission */}
      <section className="px-5">
        <Skeleton className="rounded-2xl h-24 w-full" />
      </section>

      {/* Trending */}
      <section>
        <div className="px-5 mb-4">
          <Skeleton className="h-6 w-28 rounded-lg" />
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-4 px-5 pb-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="flex-shrink-0 w-72 h-44 rounded-2xl" />
            ))}
          </div>
        </div>
      </section>

      {/* Friends */}
      <section className="px-5 space-y-4">
        <Skeleton className="h-6 w-36 rounded-lg" />
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="w-full h-44 rounded-2xl" />
        ))}
      </section>

      {/* Recommended */}
      <section className="px-5 space-y-3">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-3 w-36 rounded-lg" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4 bg-card rounded-2xl p-3">
            <Skeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <Skeleton className="h-4 w-3/4 rounded-lg" />
              <Skeleton className="h-3 w-1/2 rounded-lg" />
              <Skeleton className="h-3 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};
