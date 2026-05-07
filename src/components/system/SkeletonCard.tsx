import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';


function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted/60', className)} />;
}

export function StatCardSkeleton() {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <Skeleton className="mb-2 h-3 w-2/3" />
        <Skeleton className="h-7 w-1/3" />
      </CardContent>
    </Card>
  );
}

export function ListCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card className="border-border/70">
      <CardContent className="space-y-2 p-4">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="rounded-md border border-border/50 bg-muted/20 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

