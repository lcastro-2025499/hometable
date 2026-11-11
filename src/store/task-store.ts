"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEY } from "@/lib/constants";
import { createExampleTasks } from "@/lib/seed";
import { migrateLegacyStorage } from "@/lib/storage-migration";
import { moveTaskToColumn, normalizeOrders } from "@/lib/task-utils";
import type { NewTaskInput, Task, TaskStatus } from "@/lib/types";

interface TaskStore {
  tasks: Task[];
  userId?: string;
  /** Dueño de las tareas guardadas en localStorage (para no mezclar cuentas). */
  ownerId?: string;
  isDirty: boolean;
  setUserId: (userId?: string) => void;
  addTask: (input: NewTaskInput) => Task;
  addTasks: (tasks: Task[]) => void;
  updateTask: (id: string, input: NewTaskInput) => void;
  deleteTask: (id: string) => Task | undefined;
  restoreTask: (task: Task) => void;
  duplicateTask: (id: string) => Task | undefined;
  moveTask: (id: string, status: TaskStatus, index?: number) => void;
  setTasks: (tasks: Task[]) => void;
  toggleComplete: (id: string) => void;
  clearCompleted: () => Task[];
  replaceAll: (tasks: Task[]) => void;
  loadExamples: () => void;
  // Métodos para sincronización con Supabase
  syncFromSupabase: (tasks: Task[]) => void;
  markSaved: () => void;
  addTaskRemote: (task: Task) => void;
  updateTaskRemote: (task: Task) => void;
  deleteTaskRemote: (id: string) => void;
}

const nowIso = () => new Date().toISOString();

function buildTask(input: NewTaskInput, tasks: Task[], userId?: string): Task {
  const timestamp = nowIso();
  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    status: input.status,
    priority: input.priority,
    dueDate: input.dueDate || undefined,
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
    order: tasks.filter((task) => task.status === input.status).length,
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: input.status === "done" ? timestamp : undefined,
    ownerId: userId,
  };
}

function sameTask(a: Task, b: Task): boolean {
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.status === b.status &&
    a.priority === b.priority &&
    a.dueDate === b.dueDate &&
    a.order === b.order &&
    a.completedAt === b.completedAt &&
    a.createdAt === b.createdAt &&
    a.tags.length === b.tags.length &&
    a.tags.every((tag, index) => tag === b.tags[index])
  );
}

/** Devuelve el siguiente estado y solo las tareas que realmente cambiaron. */
function applyChange(
  before: Task[],
  next: Task[],
): { tasks: Task[]; changed: Task[] } {
  const timestamp = nowIso();
  const beforeById = new Map(before.map((task) => [task.id, task]));
  const changed: Task[] = [];

  const tasks = next.map((task) => {
    const previous = beforeById.get(task.id);
    if (previous && sameTask(previous, task)) return task;

    const stamped = { ...task, updatedAt: timestamp };
    changed.push(stamped);
    return stamped;
  });

  return { tasks, changed };
}

migrateLegacyStorage();

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [] as Task[],
      userId: undefined,
      ownerId: undefined,
      isDirty: false,
      setUserId: (userId) => {
        if (!userId) {
          set({ userId });
          return;
        }

        const currentOwner = get().ownerId;

        // Si el navegador ya pertenecía a otra cuenta, no mostramos ni
        // reenviamos sus tareas al nuevo usuario.
        if (currentOwner && currentOwner !== userId) {
          set({ userId, ownerId: userId, tasks: [], isDirty: false });
          return;
        }

        set({ userId, ownerId: userId });
      },

      addTask: (input) => {
        const before = get().tasks;
        const userId = get().userId;
        const task = buildTask(input, before, userId);

        set({ tasks: [...before, task], isDirty: true });
        return task;
      },

      addTasks: (incoming) => {
        const before = get().tasks;
        const next = normalizeOrders([...before, ...incoming]);
        const { tasks } = applyChange(before, next);

        set({ tasks, isDirty: true });
      },

      updateTask: (id, input) => {
        const before = get().tasks;
        const userId = get().userId;
        const current = before.find((task) => task.id === id);
        if (!current) return;

        const timestamp = nowIso();
        const updated: Task = {
          ...current,
          title: input.title.trim(),
          description: input.description?.trim() || undefined,
          status: input.status,
          priority: input.priority,
          dueDate: input.dueDate || undefined,
          tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
          updatedAt: timestamp,
          completedAt:
            input.status === "done"
              ? current.status === "done"
                ? current.completedAt ?? timestamp
                : timestamp
              : undefined,
          ownerId: current.ownerId ?? userId,
        };

        const withUpdated = before.map((task) =>
          task.id === id ? updated : task,
        );
        const next =
          input.status === current.status
            ? withUpdated
            : moveTaskToColumn(
                withUpdated,
                id,
                input.status,
                Number.MAX_SAFE_INTEGER,
              );

        const { tasks } = applyChange(before, next);
        set({ tasks, isDirty: true });
      },

      deleteTask: (id) => {
        const before = get().tasks;
        const task = before.find((item) => item.id === id);
        if (!task) return undefined;

        const next = normalizeOrders(before.filter((item) => item.id !== id));
        const { tasks } = applyChange(before, next);

        set({ tasks, isDirty: true });

        return task;
      },

      restoreTask: (task) => {
        const before = get().tasks;
        const userId = get().userId;
        const next = normalizeOrders([
          ...before,
          { ...task, order: Number.MAX_SAFE_INTEGER, ownerId: task.ownerId ?? userId },
        ]);
        const { tasks } = applyChange(before, next);

        set({ tasks, isDirty: true });
      },

      duplicateTask: (id) => {
        const original = get().tasks.find((task) => task.id === id);
        if (!original) return undefined;

        const userId = get().userId;
        const timestamp = nowIso();
        const copy: Task = {
          ...original,
          id: crypto.randomUUID(),
          title: `${original.title} (copia)`,
          order: Number.MAX_SAFE_INTEGER,
          createdAt: timestamp,
          updatedAt: timestamp,
          completedAt: original.status === "done" ? timestamp : undefined,
          ownerId: original.ownerId ?? userId,
        };

        const before = get().tasks;
        const next = normalizeOrders([...before, copy]);
        const { tasks } = applyChange(before, next);

        set({ tasks, isDirty: true });

        return copy;
      },

      moveTask: (id, status, index) => {
        const before = get().tasks;
        const next = moveTaskToColumn(
          before,
          id,
          status,
          index ?? Number.MAX_SAFE_INTEGER,
        );
        const { tasks } = applyChange(before, next);

        set({ tasks, isDirty: true });
      },

      setTasks: (tasks) => {
        const before = get().tasks;
        const next = normalizeOrders(tasks);
        const applied = applyChange(before, next);

        set({ tasks: applied.tasks, isDirty: true });
      },

      toggleComplete: (id) => {
        const task = get().tasks.find((item) => item.id === id);
        if (!task) return;

        get().moveTask(id, task.status === "done" ? "todo" : "done");
      },

      clearCompleted: () => {
        const before = get().tasks;
        const completed = before.filter((task) => task.status === "done");
        if (completed.length === 0) return [];

        const next = normalizeOrders(
          before.filter((task) => task.status !== "done"),
        );
        const { tasks } = applyChange(before, next);

        set({ tasks, isDirty: true });

        return completed;
      },

      replaceAll: (tasks) => {
        const userId = get().userId;
        const timestamp = nowIso();
        const normalized = normalizeOrders(tasks).map((task) => ({
          ...task,
          updatedAt: timestamp,
          ownerId: task.ownerId ?? userId,
        }));

        set({ tasks: normalized, isDirty: true });
      },

      loadExamples: () => {
        get().replaceAll(createExampleTasks());
      },

      // Sincronización con Supabase
      syncFromSupabase: (tasks) => set({ tasks: normalizeOrders(tasks), isDirty: false }),

      markSaved: () => set({ isDirty: false }),

      addTaskRemote: (task) =>
        set((state) => {
          if (state.tasks.some((item) => item.id === task.id)) return state;
          return { tasks: normalizeOrders([...state.tasks, task]) };
        }),

      updateTaskRemote: (task) =>
        set((state) => ({
          tasks: state.tasks.map((item) =>
            item.id === task.id ? task : item,
          ),
        })),

      deleteTaskRemote: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((item) => item.id !== id),
        })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ tasks: state.tasks, ownerId: state.ownerId }),
    },
  ),
);
