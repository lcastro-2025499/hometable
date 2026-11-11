import type { Task } from "./types";

/**
 * Cliente de la API de tareas. El navegador solo habla con `/api/tasks`, que
 * valida la sesión de Better Auth y deriva el dueño de las tareas en el
 * servidor. No hay caché local ni cola offline: PostgreSQL es la única fuente
 * de verdad.
 */

export type SyncFailureHandler = (message: string) => void;
export type UnauthorizedHandler = () => void;

let failureHandler: SyncFailureHandler | null = null;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** El hook de sincronización registra aquí su estrategia de recuperación. */
export function setSyncFailureHandler(handler: SyncFailureHandler | null): void {
  failureHandler = handler;
}

/**
 * Se invoca cuando el servidor responde 401: la sesión ya no es válida y el
 * usuario debe volver a iniciar sesión. El hook decide cómo limpiar la cookie
 * y redirigir, sin que esta capa conozca el router.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function logError(message: string, error: unknown): void {
  console.error(`[sync] ${message}`, error);
}

function reportFailure(message: string, error: unknown): void {
  logError(message, error);
  failureHandler?.(message);
}

async function api<T>(
  method: "GET" | "POST" | "DELETE",
  body?: unknown,
): Promise<T> {
  const response = await fetch("/api/tasks", {
    method,
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401) {
      unauthorizedHandler?.();
    }

    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new ApiError(data?.error || `Error ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}

export async function fetchRemoteTasks(): Promise<Task[]> {
  const { tasks } = await api<{ tasks: Task[] }>("GET");
  return tasks;
}

export async function pushTasks(tasks: Task[]): Promise<boolean> {
  if (tasks.length === 0) return true;

  try {
    const result = await api<{ accepted: number; rejected: number }>("POST", { tasks });

    if (result.rejected > 0) {
      reportFailure(
        "Algunas tareas no se pudieron guardar y se recargó el tablero.",
        new Error(`${result.rejected} tareas rechazadas por el servidor.`),
      );
      return false;
    }

    return true;
  } catch (error) {
    reportFailure("No se pudieron guardar los cambios.", error);
    return false;
  }
}

export async function deleteTasks(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;

  try {
    await api<{ deleted: number }>("DELETE", { ids });
    return true;
  } catch (error) {
    reportFailure("No se pudieron borrar las tareas.", error);
    return false;
  }
}
