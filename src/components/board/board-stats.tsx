import {
  CircleCheck,
  CircleDashed,
  CircleDot,
  ListTodo,
  TriangleAlert,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getTaskStats } from "@/lib/task-utils";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BoardStats({ tasks }: { tasks: Task[] }) {
  const stats = getTaskStats(tasks);

  const items = [
    {
      label: "Total",
      value: stats.total,
      icon: ListTodo,
      tone: "text-foreground",
    },
    {
      label: "Pendientes",
      value: stats.todo,
      icon: CircleDashed,
      tone: "text-muted-foreground",
    },
    {
      label: "En progreso",
      value: stats.inProgress,
      icon: CircleDot,
      tone: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Completadas",
      value: stats.done,
      icon: CircleCheck,
      tone: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Vencidas",
      value: stats.overdue,
      icon: TriangleAlert,
      tone: "text-destructive",
    },
  ];

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {items.map(({ label, value, icon: Icon, tone }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 rounded-lg border bg-background/60 px-3 py-2"
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60",
                  tone,
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] leading-none text-muted-foreground">
                  {label}
                </p>
                <p className="text-lg leading-tight font-semibold tabular-nums">
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progreso general</span>
            <span className="font-medium text-foreground tabular-nums">
              {stats.completionRate}%
            </span>
          </div>
          <Progress
            value={stats.completionRate}
            aria-label="Progreso general del tablero"
          />
        </div>
      </CardContent>
    </Card>
  );
}
