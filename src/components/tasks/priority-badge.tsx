import { Badge } from "@/components/ui/badge";
import { PRIORITY_META } from "@/lib/constants";
import type { TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PriorityBadge({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  const meta = PRIORITY_META[priority];

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border px-1.5 py-0 text-[11px] font-medium",
        meta.badgeClass,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", meta.dotClass)}
      />
      {meta.label}
    </Badge>
  );
}
