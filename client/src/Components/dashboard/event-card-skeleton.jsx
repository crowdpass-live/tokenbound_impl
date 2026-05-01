import { Card, CardFooter } from '../shared/card';
import { Skeleton } from '../shared/skeleton';

const EventCardSkeleton = () => {
  return (
    <Card className="w-full max-w-md p-4 border border-muted rounded-lg">
      <Skeleton className="rounded-t-lg w-full h-48" />
      <div className="mt-4 space-y-4">
        <Skeleton className="h-7 w-3/4" />
        <div className="flex items-center space-x-2">
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <CardFooter className="bg-base-white p-4 flex items-center justify-between">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </CardFooter>
      </div>
    </Card>
  );
};

export { EventCardSkeleton };
