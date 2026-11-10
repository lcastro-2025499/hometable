import {
  clearQueue,
  enqueueDelete,
  enqueueReplace,
  enqueueUpsert,
  readQueue,
  writeQueue,
} from "./sync-queue";
import type { Task } from "./types";

/**
 * Sincronización de tareas a través de la API del servidor. El navegador ya no
 * habla directamente con Postgres/Supabase: cada operación viaja a
 * `/api/tasks`, donde se valida la sesión y se fuerza `owner_id`.
 */

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

export function canSync(): boolean {
  return isOnline();
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function api<T>(method: "GET" | "POST" | "PUT" | "DELETE", body?: unknown): Promise<T> {
  const response = await fetch("/api/tasks", {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(data?.error || `Error ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}

function logError(message: string, error: unknown): void {
  console.error(`[sync] ${message}`, error);
}

export async function pushTasks(tasks: Task[], userId?: string): Promise<boolean> {
  if (tasks.length === 0) return true;

  if (!canSync() || !userId) {
    if (userId) tasks.forEach((task) => enqueueUpsert(userId, task));
    return false;
  }

  try {
    await api<{ accepted: number }>("POST", { tasks });
    return true;
  } catch (error) {
    logError("No se pudieron guardar las tareas.", error);
    tasks.forEach((task) => enqueueUpsert(userId, task));
    return false;
  }
}

export async function deleteTasks(ids: string[], userId?: string): Promise<boolean> {
  if (ids.length === 0) return true;

  if (!canSync() || !userId) {
    if (userId) ids.forEach((id) => enqueueDelete(userId, id));
    return false;
  }

  try {
    await api<{ deleted: number }>("DELETE", { ids });
    return true;
  } catch (error) {
    logError("No se pudieron borrar las tareas.", error);
    ids.forEach((id) => enqueueDelete(userId, id));
    return false;
  }
}

export async function replaceAllTasks(tasks: Task[], userId?: string): Promise<boolean> {
  if (!canSync() || !userId) {
    if (userId) enqueueReplace(userId, tasks);
    return false;
  }

  try {
    await api<{ accepted: number }>("PUT", { tasks });
    return true;
  } catch (error) {
    logError("No se pudo reemplazar el tablero.", error);
    enqueueReplace(userId, tasks);
    return false;
  }
}

let flushing = false;

export async function flushSyncQueue(userId?: string): Promise<boolean> {
  if (flushing || !canSync() || !userId) return false;

  flushing = true;
  try {
    const queue = readQueue(userId);

    for (let index = 0; index < queue.length; index += 1) {
      const operation = queue[index];
      try {
        if (operation.type === "upsert") {
          await api("POST", { tasks: [operation.task] });
        } else if (operation.type === "delete") {
          await api("DELETE", { ids: [operation.id] });
        } else {
          await api("PUT", { tasks: operation.tasks });
        }
      } catch (error) {
        logError("No se pudo procesar la cola de sincronización.", error);
        writeQueue(userId, queue.slice(index));
        return false;
      }
    }

    clearQueue(userId);
    return true;
  } finally {
    flushing = false;
  }
}

export async function fetchRemoteTasks(): Promise<Task[]> {
  const { tasks } = await api<{ tasks: Task[] }>("GET");
  return tasks;
}
