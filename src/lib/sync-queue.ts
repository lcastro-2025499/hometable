import type { Task } from "./types";

const QUEUE_KEY = "taskboard:sync-queue";

export type SyncOperation =
  | { type: "upsert"; task: Task }
  | { type: "delete"; id: string }
  | { type: "replace"; tasks: Task[] };

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isOperation(value: unknown): value is SyncOperation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { type?: unknown };
  if (candidate.type === "upsert") return Boolean((value as { task?: Task }).task);
  if (candidate.type === "delete") return typeof (value as { id?: unknown }).id === "string";
  if (candidate.type === "replace") return Array.isArray((value as { tasks?: Task[] }).tasks);
  return false;
}

export function readQueue(): SyncOperation[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isOperation) : [];
  } catch {
    return [];
  }
}

export function writeQueue(operations: SyncOperation[]): void {
  if (!hasStorage()) return;
  try {
    if (operations.length === 0) {
      window.localStorage.removeItem(QUEUE_KEY);
      return;
    }
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(operations));
  } catch {
    // Si el almacenamiento está lleno o bloqueado, la app sigue en modo local.
  }
}

export function clearQueue(): void {
  writeQueue([]);
}

export function enqueueUpsert(task: Task): void {
  const rest = readQueue().filter((operation) => {
    if (operation.type === "upsert") return operation.task.id !== task.id;
    if (operation.type === "delete") return operation.id !== task.id;
    return true;
  });
  writeQueue([...rest, { type: "upsert", task }]);
}

export function enqueueDelete(id: string): void {
  const rest = readQueue().filter((operation) => {
    if (operation.type === "upsert") return operation.task.id !== id;
    if (operation.type === "delete") return operation.id !== id;
    return true;
  });
  writeQueue([...rest, { type: "delete", id }]);
}

export function enqueueReplace(tasks: Task[]): void {
  writeQueue([{ type: "replace", tasks }]);
}
