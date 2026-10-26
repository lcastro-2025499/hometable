"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowRightLeft,
  CheckCircle2,
  Copy,
  GripVertical,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_META, TASK_STATUSES } from "@/lib/constants";
import type { Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TaskCardBody, TaskDueDate } from "./task-card-body";

interface TaskCardProps {
  task: Task;
  draggable: boolean;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onDuplicate: (task: Task) => void;
  onMove: (task: Task, status: TaskStatus) => void;
  onToggleComplete: (task: Task) => void;
}

export function TaskCard({
  task,
  draggable,
  onEdit,
  onDelete,
  onDuplicate,
  onMove,
  onToggleComplete,
}: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: task.id,
      data: { type: "task", status: task.status, title: task.title },
      disabled: !draggable,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-card p-2.5 shadow-xs transition-shadow hover:shadow-sm",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-1">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="min-w-0 flex-1 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <TaskCardBody task={task} />
        </button>

        <div className="flex shrink-0 items-center">
          {draggable ? (
            <button
              type="button"
              aria-label="Arrastrar tarea"
              className="inline-flex size-6 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-3.5" />
            </button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Acciones de la tarea"
                className="text-muted-foreground"
              >
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Pencil className="size-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(task)}>
                <Copy className="size-4" /> Duplicar
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowRightLeft className="size-4" /> Mover a
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {TASK_STATUSES.filter((status) => status !== task.status).map(
                    (status) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => onMove(task, status)}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "size-2 rounded-full",
                            STATUS_META[status].dotClass,
                          )}
                        />
                        {STATUS_META[status].label}
                      </DropdownMenuItem>
                    ),
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onClick={() => onToggleComplete(task)}>
                {task.status === "done" ? (
                  <RotateCcw className="size-4" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                {task.status === "done" ? "Marcar pendiente" : "Marcar completada"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(task)}>
                <Trash2 className="size-4" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <TaskDueDate task={task} />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => onToggleComplete(task)}
          aria-label={
            task.status === "done"
              ? "Marcar como pendiente"
              : "Marcar como completada"
          }
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          {task.status === "done" ? (
            <RotateCcw className="size-3.5" />
          ) : (
            <CheckCircle2 className="size-3.5" />
          )}
        </Button>
      </div>
    </article>
  );
}
