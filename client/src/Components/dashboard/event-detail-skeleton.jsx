import { Card } from '../shared/card';
import { Skeleton } from '../shared/skeleton';

const EventDetailSkeleton = () => {
  return (
    <Card className="shadow-2xl pb-6 my-4 rounded-xl">
      <div className="flex flex-col mx-10 mt-10">
        {/* Banner skeleton */}
        <Skeleton className="rounded-2xl w-full h-[300px]" />

        <div className="flex justify-evenly items-start mt-6">
          {/* Left column */}
          <div className="flex flex-col gap-6 w-[50%]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="w-6 h-6 rounded" />
                <div className="flex flex-col gap-1 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            ))}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6 w-[50%]">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="w-6 h-6 rounded" />
                <div className="flex flex-col gap-1 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
            <div className="flex gap-4 mt-2">
              <Skeleton className="h-11 flex-1 rounded-md" />
              <Skeleton className="h-11 flex-1 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pr-10 my-2">
        <Skeleton className="h-4 w-48" />
      </div>
    </Card>
  );
};

export { EventDetailSkeleton };
