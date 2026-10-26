import type { Task } from "@/lib/types";
import { TaskCardBody, TaskDueDate } from "./task-card-body";

export function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <div className="w-72 rotate-2 rounded-lg border bg-card p-2.5 shadow-xl">
      <TaskCardBody task={task} />
      <div className="mt-2">
        <TaskDueDate task={task} />
      </div>
    </div>
  );
}
