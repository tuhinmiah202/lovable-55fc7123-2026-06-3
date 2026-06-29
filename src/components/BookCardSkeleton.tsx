import { Skeleton } from "@/components/ui/skeleton";

const BookCardSkeleton = () => (
  <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card">
    <Skeleton className="aspect-[3/4] w-full rounded-none" />
    <div className="flex flex-col gap-1.5 p-2 sm:p-3">
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-2.5 w-1/2" />
      <div className="mt-1.5 flex items-center justify-between">
        <Skeleton className="h-2.5 w-10" />
        <Skeleton className="h-3 w-8" />
      </div>
    </div>
  </div>
);

export const BookCardSkeletonGrid = ({ count = 10 }: { count?: number }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
    {Array.from({ length: count }).map((_, i) => (
      <BookCardSkeleton key={i} />
    ))}
  </div>
);

export default BookCardSkeleton;
