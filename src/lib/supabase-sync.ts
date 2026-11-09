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

export function canUseSupabase(): boolean {
  return Boolean(supabase) && isOnline();
}

async function runUpsert(tasks: Task[]): Promise<void> {
  if (!supabase) throw new Error("Supabase no está configurado.");
  if (tasks.length === 0) return;

  const { error } = await supabase
    .from("tasks")
    .upsert(tasks.map(taskToRow), { onConflict: "id" });

  if (error) throw error;
}

async function runDelete(ids: string[]): Promise<void> {
  if (!supabase) throw new Error("Supabase no está configurado.");
  if (ids.length === 0) return;

  const { error } = await supabase.from("tasks").delete().in("id", ids);
  if (error) throw error;
}

async function runReplace(tasks: Task[]): Promise<void> {
  if (!supabase) throw new Error("Supabase no está configurado.");

  const { data, error } = await supabase.from("tasks").select("id");
  if (error) throw error;

  const keep = new Set(tasks.map((task) => task.id));
  const remove = (data ?? [])
    .map((row) => row.id)
    .filter((id) => !keep.has(id));

  if (remove.length > 0) {
    await runDelete(remove);
  }

  await runUpsert(tasks);
}

function logError(message: string, error: unknown): void {
  console.error(`[sync] ${message}`, error);
}

export async function pushTasks(tasks: Task[]): Promise<boolean> {
  if (tasks.length === 0) return true;

  if (!canUseSupabase()) {
    tasks.forEach(enqueueUpsert);
    return false;
  }

  try {
    await runUpsert(tasks);
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

export async function replaceAllTasks(tasks: Task[]): Promise<boolean> {
  if (!canUseSupabase()) {
    enqueueReplace(tasks);
    return false;
  }

  try {
    await runReplace(tasks);
    return true;
  } catch (error) {
    logError("No se pudo reemplazar el tablero en Supabase.", error);
    enqueueReplace(tasks);
    return false;
  }
}

let flushing = false;

export async function flushSyncQueue(): Promise<boolean> {
  if (flushing || !canUseSupabase()) return false;

  flushing = true;
  try {
    const queue = readQueue();

    for (let index = 0; index < queue.length; index += 1) {
      const operation = queue[index];
      try {
        if (operation.type === "upsert") {
          await runUpsert([operation.task]);
        } else if (operation.type === "delete") {
          await runDelete([operation.id]);
        } else {
          await runReplace(operation.tasks);
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

export async function fetchRemoteTasks(): Promise<Task[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToTask);
}
