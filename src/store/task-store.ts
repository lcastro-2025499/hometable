"use client";

import { create } from "zustand";

import { deleteTasks, pushTasks } from "@/lib/tasks-sync";
import { moveTaskToColumn, normalizeOrders } from "@/lib/task-utils";
import type { NewTaskInput, Task, TaskStatus } from "@/lib/types";

interface TaskStore {
  tasks: Task[];
  userId?: string;
  setUserId: (userId?: string) => void;
  addTask: (input: NewTaskInput) => Task;
  addTasks: (tasks: Task[]) => void;
  updateTask: (id: string, input: NewTaskInput) => void;
  deleteTask: (id: string) => Task | undefined;
  restoreTask: (task: Task) => void;
  duplicateTask: (id: string) => Task | undefined;
  moveTask: (id: string, status: TaskStatus, index?: number) => void;
  /** Reordena el tablero tras un arrastre y guarda solo lo que cambió. */
  setTasks: (tasks: Task[]) => void;
  /** Reemplaza el estado con la copia autoritativa del servidor (no escribe). */
  replaceFromServer: (tasks: Task[]) => void;
  toggleComplete: (id: string) => void;
  clearCompleted: () => Task[];
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

export const useTaskStore = create<TaskStore>()((set, get) => ({
  tasks: [],
  userId: undefined,

  setUserId: (userId) => {
    const current = get().userId;

    // Al cambiar de cuenta se descarta el tablero anterior: la fuente de
    // verdad es el servidor y cada usuario tiene sus propias tareas.
    if (current !== userId) {
      set({ userId, tasks: [] });
      return;
    }

    set({ userId });
  },

  addTask: (input) => {
    const before = get().tasks;
    const userId = get().userId;
    const task = buildTask(input, before, userId);

    set({ tasks: [...before, task] });
    void pushTasks([task]);

    return task;
  },

  addTasks: (incoming) => {
    const before = get().tasks;
    const next = normalizeOrders([...before, ...incoming]);
    const { tasks, changed } = applyChange(before, next);

    set({ tasks });
    void pushTasks(changed);
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

    const { tasks, changed } = applyChange(before, next);
    set({ tasks });
    void pushTasks(changed);
  },

  deleteTask: (id) => {
    const before = get().tasks;
    const task = before.find((item) => item.id === id);
    if (!task) return undefined;

    const next = normalizeOrders(before.filter((item) => item.id !== id));
    const { tasks, changed } = applyChange(before, next);

    set({ tasks });
    void deleteTasks([id]);
    void pushTasks(changed);

    return task;
  },

  restoreTask: (task) => {
    const before = get().tasks;
    const userId = get().userId;
    const next = normalizeOrders([
      ...before,
      { ...task, order: Number.MAX_SAFE_INTEGER, ownerId: task.ownerId ?? userId },
    ]);
    const { tasks, changed } = applyChange(before, next);

    set({ tasks });
    void pushTasks(changed);
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
    const { tasks, changed } = applyChange(before, next);

    set({ tasks });
    void pushTasks(changed);

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
    const { tasks, changed } = applyChange(before, next);

    set({ tasks });
    void pushTasks(changed);
  },

  setTasks: (tasks) => {
    const before = get().tasks;
    const next = normalizeOrders(tasks);
    const applied = applyChange(before, next);

    set({ tasks: applied.tasks });
    void pushTasks(applied.changed);
  },

  replaceFromServer: (tasks) => set({ tasks: normalizeOrders(tasks) }),

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
    const { tasks, changed } = applyChange(before, next);

    set({ tasks });
    void deleteTasks(completed.map((task) => task.id));
    void pushTasks(changed);

    return completed;
  },

  addTaskRemote: (task) =>
    set((state) => {
      if (state.tasks.some((item) => item.id === task.id)) return state;
      return { tasks: normalizeOrders([...state.tasks, task]) };
    }),

  updateTaskRemote: (task) =>
    set((state) => ({
      tasks: state.tasks.map((item) =>
        item.id === task.id && Date.parse(task.updatedAt) >= Date.parse(item.updatedAt)
          ? task
          : item,
      ),
    })),

  deleteTaskRemote: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((item) => item.id !== id),
    })),
}));
