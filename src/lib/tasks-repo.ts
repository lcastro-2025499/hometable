import { z } from "zod";

import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  MAX_TITLE_LENGTH,
} from "./constants";
import { pool } from "./db";
import { isDateOnly } from "./task-utils";
import { rowToTask } from "./task-mapper";
import { TASK_PRIORITIES, TASK_STATUSES, type Task } from "./types";

/**
 * Acceso a la tabla `public.tasks` desde el servidor. Todas las consultas usan
 * parámetros vinculados (nunca interpolación de valores) y derivan el dueño de
 * la sesión, de modo que un cliente no puede leer ni modificar tareas ajenas.
 */

const MAX_BATCH_SIZE = 500;

const taskPayloadSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
  description: z
    .string()
    .trim()
    .max(MAX_DESCRIPTION_LENGTH)
    .nullish(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: z.string().refine(isDateOnly, "dueDate inválido.").nullish(),
  tags: z
    .array(z.string().trim().min(1).max(MAX_TAG_LENGTH))
    .max(MAX_TAGS)
    .default([]),
  order: z.number().int().min(0).max(1_000_000),
  createdAt: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "createdAt inválido."),
  updatedAt: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "updatedAt inválido."),
  completedAt: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "completedAt inválido.")
    .nullish(),
});

export type TaskPayload = z.infer<typeof taskPayloadSchema>;

export interface WriteResult {
  accepted: number;
  rejected: number;
}

function parseTasks(input: unknown): { tasks: TaskPayload[]; rejected: number } {
  if (!Array.isArray(input)) return { tasks: [], rejected: 0 };

  const limited = input.slice(0, MAX_BATCH_SIZE);
  const tasks: TaskPayload[] = [];
  let rejected = input.length - limited.length;

  for (const candidate of limited) {
    const parsed = taskPayloadSchema.safeParse(candidate);
    if (parsed.success) tasks.push(parsed.data);
    else rejected += 1;
  }

  return { tasks, rejected };
}

type Queryable = Pick<typeof pool, "query">;

/** Devuelve cuántas filas se escribieron realmente. */
async function insertTasks(
  client: Queryable,
  userId: string,
  tasks: TaskPayload[],
): Promise<number> {
  if (tasks.length === 0) return 0;

  const columns = 12;
  const values: unknown[] = [];
  const tuples: string[] = [];

  tasks.forEach((task, index) => {
    const base = index * columns;
    tuples.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12})`,
    );
    values.push(
      task.id,
      task.title,
      task.description ?? null,
      task.status,
      task.priority,
      task.dueDate ?? null,
      task.tags,
      task.order,
      task.createdAt,
      task.updatedAt,
      task.completedAt ?? null,
      userId,
    );
  });

  // `where public.tasks.owner_id = excluded.owner_id` impide que alguien
  // sobrescriba una tarea existente cuyo dueño sea otro usuario.
  const sql = `
    insert into public.tasks (
      id, title, description, status, priority, due_date, tags, "order",
      created_at, updated_at, completed_at, owner_id
    )
    values ${tuples.join(", ")}
    on conflict (id) do update set
      title = excluded.title,
      description = excluded.description,
      status = excluded.status,
      priority = excluded.priority,
      due_date = excluded.due_date,
      tags = excluded.tags,
      "order" = excluded."order",
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      completed_at = excluded.completed_at
    where public.tasks.owner_id = excluded.owner_id
    returning id
  `;

  const result = await client.query(sql, values);
  return result.rowCount ?? 0;
}

export async function listTasks(userId: string): Promise<Task[]> {
  const { rows } = await pool.query(
    `select * from public.tasks where owner_id = $1 order by created_at desc`,
    [userId],
  );

  return rows.map(rowToTask);
}

export async function upsertTasks(userId: string, input: unknown): Promise<WriteResult> {
  const { tasks, rejected } = parseTasks(input);
  const written = await insertTasks(pool, userId, tasks);

  return { accepted: written, rejected: rejected + (tasks.length - written) };
}

export async function deleteTasksByIds(
  userId: string,
  ids: unknown,
): Promise<{ deleted: number }> {
  const parsed = z.array(z.string().uuid()).max(MAX_BATCH_SIZE).safeParse(ids);
  if (!parsed.success || parsed.data.length === 0) return { deleted: 0 };

  const result = await pool.query(
    `delete from public.tasks where owner_id = $1 and id = any($2::uuid[])`,
    [userId, parsed.data],
  );

  return { deleted: result.rowCount ?? 0 };
}
