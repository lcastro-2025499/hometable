import { LEGACY_STORAGE_KEY, STORAGE_KEY } from "./constants";

interface PersistedState {
  state?: { tasks?: unknown };
  tasks?: unknown;
  version?: number;
}

function readTasks(raw: string): unknown[] | null {
  try {
    const parsed = JSON.parse(raw) as PersistedState;
    const tasks = parsed?.state?.tasks ?? parsed?.tasks;
    return Array.isArray(tasks) ? tasks : null;
  } catch {
    return null;
  }
}

/**
 * Migra la clave histórica `taskboard:v1` a `taskboard:v2` sin borrar el
 * respaldo original. Se ejecuta antes de que Zustand hidrate el store.
 */
export function migrateLegacyStorage(): void {
  if (typeof window === "undefined") return;

  try {
    if (window.localStorage.getItem(STORAGE_KEY)) return;

    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return;

    const tasks = readTasks(legacy);
    if (!tasks) return;

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { tasks }, version: 1 }),
    );
  } catch {
    // Si localStorage está bloqueado, la app arranca vacía sin romperse.
  }
}
