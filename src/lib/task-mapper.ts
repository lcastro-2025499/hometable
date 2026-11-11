import { isTaskPriority, isTaskStatus, toDateOnly } from "./task-utils";
import type { Database } from "./types/supabase";
import type { Task } from "./types";

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"] & { owner_id?: string | null };

/**
 * `date` debe viajar siempre como `YYYY-MM-DD`. El pool ya devuelve texto, pero
 * Realtime y cualquier consulta futura podrían entregar un `Date`, así que se
 * normaliza aquí para no depender del driver.
 */
function normalizeDueDate(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return toDateOnly(value);
  if (typeof value !== "string") return undefined;

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : undefined;
}

export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    status: isTaskStatus(row.status) ? row.status : "todo",
    priority: isTaskPriority(row.priority) ? row.priority : "low",
    dueDate: normalizeDueDate(row.due_date),
    tags: row.tags ?? [],
    order: row.order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? undefined,
    ownerId: row.owner_id ?? undefined,
  };
}
