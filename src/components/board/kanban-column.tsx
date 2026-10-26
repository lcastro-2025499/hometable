"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { STATUS_META } from "@/lib/constants";
import type { Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TaskCard } from "./task-card";

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  totalInColumn: number;
  canDrag: boolean;
  onAdd: (status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onDuplicate: (task: Task) => void;
  onMove: (task: Task, status: TaskStatus) => void;
  onToggleComplete: (task: Task) => void;
  onClearCompleted?: () => void;
}

export function KanbanColumn({
  status,
  tasks,
  totalInColumn,
  canDrag,
  onAdd,
  onEdit,
  onDelete,
  onDuplicate,
  onMove,
  onToggleComplete,
  onClearCompleted,
}: KanbanColumnProps) {
  const meta = STATUS_META[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      aria-label={`Columna ${meta.label}`}
      className={cn(
        "flex min-w-[85vw] snap-center flex-col rounded-xl border border-t-4 bg-muted/30 md:min-w-0",
        meta.columnClass,
      )}
    >
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <span
          aria-hidden="true"
          className={cn("size-2 rounded-full", meta.dotClass)}
        />
        <h2 className="text-sm font-medium">{meta.label}</h2>
        <Badge
          variant="secondary"
          className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[11px] tabular-nums"
        >
          {tasks.length}
        </Badge>
        {totalInColumn > tasks.length ? (
          <span className="text-[11px] text-muted-foreground">
            de {totalInColumn}
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-0.5">
          {status === "done" && onClearCompleted && tasks.length > 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={onClearCompleted}
                  aria-label="Eliminar tareas completadas"
                  className="text-muted-foreground"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Eliminar completadas</TooltipContent>
            </Tooltip>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onAdd(status)}
                aria-label={`Añadir tarea a ${meta.label}`}
                className="text-muted-foreground"
              >
                <Plus className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Añadir tarea</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-28 flex-1 flex-col gap-2 rounded-b-xl p-2 transition-colors",
          isOver && "bg-muted/60",
        )}
      >
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              draggable={canDrag}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onMove={onMove}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 py-8 text-center">
            <p className="text-xs font-medium text-muted-foreground">
              {totalInColumn > 0 ? "Sin resultados" : "Sin tareas"}
            </p>
            <p className="text-[11px] text-muted-foreground/80">
              {totalInColumn > 0
                ? "Ninguna coincide con los filtros."
                : "Arrastra una tarea aquí o pulsa +."}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
