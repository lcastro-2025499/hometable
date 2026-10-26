import { CalendarDays } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { dueDateTone, formatDueDate, isOverdue } from "@/lib/task-utils";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskCardBody({ task }: { task: Task }) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1">
        <PriorityBadge priority={task.priority} />
        {task.tags.slice(0, 2).map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="max-w-28 truncate px-1.5 py-0 text-[11px] font-normal"
          >
            {tag}
          </Badge>
        ))}
        {task.tags.length > 2 ? (
          <span className="text-[11px] text-muted-foreground">
            +{task.tags.length - 2}
          </span>
        ) : null}
      </div>

      <h3
        className={cn(
          "line-clamp-2 text-sm leading-snug font-medium",
          task.status === "done" && "text-muted-foreground line-through",
        )}
      >
        {task.title}
      </h3>

      {task.description ? (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {task.description}
        </p>
      ) : null}
    </div>
  );
}

export function TaskDueDate({ task }: { task: Task }) {
  if (!task.dueDate) return null;

  return (
    <p
      className={cn(
        "flex items-center gap-1 text-[11px] font-medium",
        dueDateTone(task),
      )}
    >
      <CalendarDays className="size-3" aria-hidden="true" />
      <span>{formatDueDate(task.dueDate)}</span>
      {isOverdue(task) ? <span className="sr-only">Vencida</span> : null}
    </p>
  );
}
