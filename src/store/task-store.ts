"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEY } from "@/lib/constants";
import { createExampleTasks } from "@/lib/seed";
import { byOrder, moveTaskToColumn, normalizeOrders } from "@/lib/task-utils";
import type { NewTaskInput, Task, TaskStatus } from "@/lib/types";

interface TaskStore {
  tasks: Task[];
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
}

const nowIso = () => new Date().toISOString();

function buildTask(input: NewTaskInput, tasks: Task[]): Task {
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
  };
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],

      addTask: (input) => {
        const task = buildTask(input, get().tasks);
        set((state) => ({ tasks: [...state.tasks, task] }));
        return task;
      },

      addTasks: (incoming) =>
        set((state) => ({
          tasks: normalizeOrders([...state.tasks, ...incoming]),
        })),

      updateTask: (id, input) =>
        set((state) => {
          const current = state.tasks.find((task) => task.id === id);
          if (!current) return state;

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
          };

          const tasks = state.tasks.map((task) => (task.id === id ? updated : task));

          return {
            tasks:
              input.status === current.status
                ? tasks
                : moveTaskToColumn(tasks, id, input.status, Number.MAX_SAFE_INTEGER),
          };
        }),

      deleteTask: (id) => {
        const task = get().tasks.find((item) => item.id === id);
        if (!task) return undefined;

        set((state) => {
          const remaining = state.tasks.filter((item) => item.id !== id);
          const updates = new Map<string, Task>();
          remaining
            .filter((item) => item.status === task.status)
            .sort(byOrder)
            .forEach((item, index) => {
              updates.set(item.id, { ...item, order: index });
            });
          return { tasks: remaining.map((item) => updates.get(item.id) ?? item) };
        });

        return task;
      },

      restoreTask: (task) =>
        set((state) => ({
          tasks: normalizeOrders([...state.tasks, { ...task, order: Number.MAX_SAFE_INTEGER }]),
        })),

      duplicateTask: (id) => {
        const original = get().tasks.find((task) => task.id === id);
        if (!original) return undefined;

        const timestamp = nowIso();
        const copy: Task = {
          ...original,
          id: crypto.randomUUID(),
          title: `${original.title} (copia)`,
          order: Number.MAX_SAFE_INTEGER,
          createdAt: timestamp,
          updatedAt: timestamp,
          completedAt: original.status === "done" ? timestamp : undefined,
        };

        set((state) => ({
          tasks: normalizeOrders([...state.tasks, copy]),
        }));

        return copy;
      },

      moveTask: (id, status, index) =>
        set((state) => ({
          tasks: moveTaskToColumn(
            state.tasks,
            id,
            status,
            index ?? Number.MAX_SAFE_INTEGER,
          ),
        })),

      setTasks: (tasks) => set({ tasks }),

      toggleComplete: (id) => {
        const task = get().tasks.find((item) => item.id === id);
        if (!task) return;
        const nextStatus: TaskStatus = task.status === "done" ? "todo" : "done";
        set((state) => ({
          tasks: moveTaskToColumn(
            state.tasks,
            id,
            nextStatus,
            Number.MAX_SAFE_INTEGER,
          ),
        }));
      },

      clearCompleted: () => {
        const completed = get().tasks.filter((task) => task.status === "done");
        if (completed.length === 0) return [];
        set((state) => ({
          tasks: state.tasks.filter((task) => task.status !== "done"),
        }));
        return completed;
      },

      replaceAll: (tasks) => set({ tasks: normalizeOrders(tasks) }),

      loadExamples: () => set({ tasks: createExampleTasks() }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ tasks: state.tasks }),
    },
  ),
);
