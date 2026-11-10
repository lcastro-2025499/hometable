import { supabase } from "./supabase";
import { rowToTask, taskToRow } from "./task-mapper";
import {
  clearQueue,
  enqueueDelete,
  enqueueReplace,
  enqueueUpsert,
  readQueue,
  writeQueue,
} from "./sync-queue";
import type { Task } from "./types";

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

// Los IDs de Better Auth son alfanuméricos. Validamos antes de interpolarlos
// en filtros PostgREST (`.or(...)`) para evitar inyección de filtros.
const SAFE_USER_ID = /^[A-Za-z0-9_-]{1,128}$/;

function ownedOrNullFilter(userId: string): string {
  if (!SAFE_USER_ID.test(userId)) {
    throw new Error("Identificador de usuario inválido.");
  }
  return `owner_id.eq.${userId},owner_id.is.null`;
}

export function canUseSupabase(): boolean {
  return Boolean(supabase) && isOnline();
}

async function runUpsert(tasks: Task[], userId?: string): Promise<void> {
  if (!supabase) throw new Error("Supabase no está configurado.");
  if (tasks.length === 0) return;

  const { error } = await supabase
    .from("tasks")
    .upsert(tasks.map((task) => taskToRow(task, userId)), { onConflict: "id" });

  if (error) throw error;
}

async function runDelete(ids: string[]): Promise<void> {
  if (!supabase) throw new Error("Supabase no está configurado.");
  if (ids.length === 0) return;

  const { error } = await supabase.from("tasks").delete().in("id", ids);
  if (error) throw error;
}

async function runReplace(tasks: Task[], userId?: string): Promise<void> {
  if (!supabase) throw new Error("Supabase no está configurado.");

  let query = supabase.from("tasks").select("id");
  if (userId) {
    query = query.or(ownedOrNullFilter(userId));
  }

  const { data, error } = await query;
  if (error) throw error;

  const keep = new Set(tasks.map((task) => task.id));
  const remove = (data ?? [])
    .map((row) => row.id)
    .filter((id) => !keep.has(id));

  if (remove.length > 0) {
    await runDelete(remove);
  }

  await runUpsert(tasks, userId);
}

function logError(message: string, error: unknown): void {
  console.error(`[sync] ${message}`, error);
}

export async function pushTasks(tasks: Task[], userId?: string): Promise<boolean> {
  if (tasks.length === 0) return true;

  if (!canUseSupabase()) {
    tasks.forEach(enqueueUpsert);
    return false;
  }

  try {
    await runUpsert(tasks, userId);
    return true;
  } catch (error) {
    logError("No se pudieron guardar las tareas en Supabase.", error);
    tasks.forEach(enqueueUpsert);
    return false;
  }
}

export async function deleteTasks(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;

  if (!canUseSupabase()) {
    ids.forEach(enqueueDelete);
    return false;
  }

  try {
    await runDelete(ids);
    return true;
  } catch (error) {
    logError("No se pudieron borrar las tareas en Supabase.", error);
    ids.forEach(enqueueDelete);
    return false;
  }
}

export async function replaceAllTasks(tasks: Task[], userId?: string): Promise<boolean> {
  if (!canUseSupabase()) {
    enqueueReplace(tasks);
    return false;
  }

  try {
    await runReplace(tasks, userId);
    return true;
  } catch (error) {
    logError("No se pudo reemplazar el tablero en Supabase.", error);
    enqueueReplace(tasks);
    return false;
  }
}

let flushing = false;

export async function flushSyncQueue(userId?: string): Promise<boolean> {
  if (flushing || !canUseSupabase()) return false;

  flushing = true;
  try {
    const queue = readQueue();

    for (let index = 0; index < queue.length; index += 1) {
      const operation = queue[index];
      try {
        if (operation.type === "upsert") {
          await runUpsert([operation.task], userId);
        } else if (operation.type === "delete") {
          await runDelete([operation.id]);
        } else {
          await runReplace(operation.tasks, userId);
        }
      } catch (error) {
        logError("No se pudo procesar la cola de sincronización.", error);
        writeQueue(queue.slice(index));
        return false;
      }
    }

    clearQueue();
    return true;
  } finally {
    flushing = false;
  }
}

export async function fetchRemoteTasks(userId?: string): Promise<Task[]> {
  if (!supabase) return [];

  let query = supabase.from("tasks").select("*");
  if (userId) {
    query = query.or(ownedOrNullFilter(userId));
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToTask);
}
