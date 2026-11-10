import type { Task } from "./types";

const QUEUE_KEY = "taskboard:sync-queue";

export type SyncOperation =
  | { type: "upsert"; task: Task }
  | { type: "delete"; id: string }
  | { type: "replace"; tasks: Task[] };

interface StoredQueue {
  ownerId: string;
  operations: SyncOperation[];
}

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

function readStored(): StoredQueue | null {
  if (!hasStorage()) return null;

  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      // Formato antiguo (sin dueño). Se descarta para no mezclar datos entre
      // cuentas distintas que usen el mismo navegador.
      return null;
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as StoredQueue).ownerId === "string" &&
      Array.isArray((parsed as StoredQueue).operations)
    ) {
      return {
        ownerId: (parsed as StoredQueue).ownerId,
        operations: (parsed as StoredQueue).operations.filter(isOperation),
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * La cola está vinculada a un usuario concreto: si otra cuenta inicia sesión en
 * el mismo navegador nunca podrá enviar operaciones ajenas.
 */
export function readQueue(userId: string): SyncOperation[] {
  const stored = readStored();
  if (!stored || stored.ownerId !== userId) return [];
  return stored.operations;
}

export function writeQueue(userId: string, operations: SyncOperation[]): void {
  if (!hasStorage()) return;

  try {
    if (operations.length === 0) {
      window.localStorage.removeItem(QUEUE_KEY);
      return;
    }

    const payload: StoredQueue = { ownerId: userId, operations };
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(payload));
  } catch {
    // Si el almacenamiento está lleno o bloqueado, la app sigue en modo local.
  }
}

export function clearQueue(userId: string): void {
  writeQueue(userId, []);
}

function enqueue(userId: string, operation: SyncOperation): void {
  const rest = readQueue(userId).filter((item) => {
    if (item.type === "upsert" && operation.type === "upsert") {
      return item.task.id !== operation.task.id;
    }
    if (item.type === "delete" && operation.type === "delete") {
      return item.id !== operation.id;
    }
    if (operation.type === "upsert") {
      return !(item.type === "delete" && item.id === operation.task.id);
    }
    if (operation.type === "delete") {
      return !(item.type === "upsert" && item.task.id === operation.id);
    }
    return true;
  });

  writeQueue(userId, [...rest, operation]);
}

export function enqueueUpsert(userId: string, task: Task): void {
  enqueue(userId, { type: "upsert", task });
}

export function enqueueDelete(userId: string, id: string): void {
  enqueue(userId, { type: "delete", id });
}

export function enqueueReplace(userId: string, tasks: Task[]): void {
  writeQueue(userId, [{ type: "replace", tasks }]);
}
