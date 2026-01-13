import { Skeleton } from "@/components/ui/skeleton";

interface EventCardSkeletonProps {
  variant?: 'default' | 'compact' | 'featured';
}

export const EventCardSkeleton = ({ variant = 'default' }: EventCardSkeletonProps) => {
  if (variant === 'featured') {
    return (
      <div className="relative w-80 h-48 rounded-2xl overflow-hidden">
        <Skeleton className="w-full h-full" />
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="bg-card rounded-xl p-3 sm:p-4 space-y-3">
        <div className="flex space-x-2 sm:space-x-3">
          <Skeleton className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-10" />
          </div>
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className="bg-card rounded-2xl overflow-hidden">
      <Skeleton className="w-full h-40" />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
};
