"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Task, TaskStatus } from "@/lib/types";
import { TaskForm } from "./task-form";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  defaultStatus: TaskStatus;
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultStatus,
}: TaskDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
          <DialogDescription>
            {task
              ? "Actualiza los detalles de la tarea."
              : "Describe la tarea y asígnala a una columna."}
          </DialogDescription>
        </DialogHeader>
        <TaskForm
          key={task?.id ?? `new-${defaultStatus}`}
          task={task}
          defaultStatus={defaultStatus}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
