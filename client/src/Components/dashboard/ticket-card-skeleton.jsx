import { Skeleton } from '../shared/skeleton';
import { Card, CardContent } from '../shared/card';

export function TicketCardSkeleton() {
  return (
    <Card className="shadow-lg overflow-hidden">
      {/* Image placeholder */}
      <div className="relative h-40 bg-gray-200 animate-pulse" />

      <CardContent className="p-5 space-y-4">
        {/* Event details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>

        {/* TBA info placeholder */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>

        {/* QR code placeholder */}
        <div className="flex justify-center py-3">
          <Skeleton className="h-[120px] w-[120px] rounded-lg" />
        </div>

        {/* Action buttons placeholder */}
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}
