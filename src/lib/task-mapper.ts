import { isTaskPriority, isTaskStatus } from "./task-utils";
import type { Database } from "./types/supabase";
import type { Task } from "./types";

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"] & { owner_id?: string | null };

export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    status: isTaskStatus(row.status) ? row.status : "todo",
    priority: isTaskPriority(row.priority) ? row.priority : "low",
    dueDate: row.due_date ?? undefined,
    tags: row.tags ?? [],
    order: row.order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? undefined,
    ownerId: row.owner_id ?? undefined,
  };
}
