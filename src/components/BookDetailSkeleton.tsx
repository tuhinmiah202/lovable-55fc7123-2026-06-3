import { Skeleton } from "@/components/ui/skeleton";

const BookDetailSkeleton = () => (
  <div className="container mx-auto px-4 py-4 md:py-8">
    <Skeleton className="mb-3 h-4 w-28 md:mb-6" />
    <div className="grid gap-4 grid-cols-[110px_1fr] sm:grid-cols-[140px_1fr] md:grid-cols-[300px_1fr] md:gap-8 lg:grid-cols-[350px_1fr]">
      <Skeleton className="aspect-[3/4] w-full rounded-lg md:rounded-2xl" />
      <div className="min-w-0 space-y-3">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-5 w-12 rounded" />
        </div>
        <Skeleton className="h-6 w-3/4 md:h-10" />
        <Skeleton className="h-4 w-1/2 md:h-6" />
        <div className="flex gap-3">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
        </div>
        <Skeleton className="h-7 w-24 md:h-10" />
        <div className="flex flex-wrap gap-2 pt-2">
          <Skeleton className="h-9 w-28 rounded-xl md:h-11 md:w-36" />
          <Skeleton className="h-9 w-32 rounded-xl md:h-11 md:w-44" />
        </div>
        <div className="space-y-2 pt-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-2 pt-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  </div>
);

export default BookDetailSkeleton;
