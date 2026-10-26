import { Skeleton } from "@/components/ui/skeleton";

export function BoardSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-[136px] w-full rounded-xl" />
      <Skeleton className="h-[76px] w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((column) => (
          <div
            key={column}
            className="space-y-2 rounded-xl border bg-muted/30 p-3"
          >
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
