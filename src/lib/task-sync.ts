import { normalizeOrders } from "./task-utils";
import type { Task } from "./types";

export interface ReconcileResult {
  merged: Task[];
  localOnly: Task[];
  localNewer: Task[];
  remoteOnly: Task[];
}

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Combina el tablero local con el remoto sin perder tareas.
 * - Si una tarea existe en ambos, gana la de `updatedAt` más reciente.
 * - Las tareas que solo existen en local se devuelven para decidir si subirlas.
 */
export function reconcileTasks(local: Task[], remote: Task[]): ReconcileResult {
  const remoteById = new Map(remote.map((task) => [task.id, task]));
  const localById = new Map(local.map((task) => [task.id, task]));
  const mergedById = new Map(remoteById);
  const localOnly: Task[] = [];
  const localNewer: Task[] = [];

  for (const localTask of local) {
    const remoteTask = remoteById.get(localTask.id);

    if (!remoteTask) {
      localOnly.push(localTask);
      mergedById.set(localTask.id, localTask);
      continue;
    }

    if (timestamp(localTask.updatedAt) > timestamp(remoteTask.updatedAt)) {
      localNewer.push(localTask);
      mergedById.set(localTask.id, localTask);
    }
  }

  const remoteOnly = remote.filter((task) => !localById.has(task.id));

  return {
    merged: normalizeOrders([...mergedById.values()]),
    localOnly,
    localNewer,
    remoteOnly,
  };
}
