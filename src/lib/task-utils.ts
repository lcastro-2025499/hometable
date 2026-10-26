import { differenceInCalendarDays, format, isSameDay, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { PRIORITY_META, TASK_STATUSES } from "./constants";
import type { Task, TaskFilters, TaskSort, TaskStats, TaskStatus } from "./types";

export const byOrder = (a: Task, b: Task) => a.order - b.order;

export function parseDateOnly(value?: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function isOverdue(task: Task, now = new Date()): boolean {
  if (!task.dueDate || task.status === "done") return false;
  const due = parseDateOnly(task.dueDate);
  return Boolean(due && due.getTime() < startOfDay(now).getTime());
}

export function formatDueDate(value?: string, now = new Date()): string {
  const date = parseDateOnly(value);
  if (!date) return "";
  const diff = differenceInCalendarDays(date, startOfDay(now));
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  if (date.getFullYear() === now.getFullYear()) {
    return format(date, "d MMM", { locale: es });
  }
  return format(date, "d MMM yyyy", { locale: es });
}

export function dueDateTone(task: Task, now = new Date()): string {
  if (!task.dueDate) return "";
  if (task.status === "done") return "text-muted-foreground";
  const due = parseDateOnly(task.dueDate);
  if (!due) return "";
  const diff = differenceInCalendarDays(due, startOfDay(now));
  if (diff < 0) return "text-destructive";
  if (diff === 0) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

export function filterTasks(tasks: Task[], filters: TaskFilters, now = new Date()): Task[] {
  const query = normalizeText(filters.query.trim());
  const today = startOfDay(now);

  return tasks.filter((task) => {
    if (query) {
      const haystack = normalizeText(
        [task.title, task.description ?? "", ...task.tags].join(" "),
      );
      if (!haystack.includes(query)) return false;
    }

    if (filters.priority !== "all" && task.priority !== filters.priority) {
      return false;
    }

    if (filters.tag && !task.tags.includes(filters.tag)) return false;

    if (filters.due !== "all") {
      if (filters.due === "none") {
        if (task.dueDate) return false;
      } else {
        const due = parseDateOnly(task.dueDate);
        if (!due) return false;
        if (filters.due === "overdue" && !isOverdue(task, now)) return false;
        if (filters.due === "today" && !isSameDay(due, today)) return false;
        if (filters.due === "week") {
          const diff = differenceInCalendarDays(due, today);
          if (diff < 0 || diff > 7) return false;
        }
      }
    }

    return true;
  });
}

export function sortTasks(tasks: Task[], sort: TaskSort): Task[] {
  const copy = [...tasks];
  if (sort === "manual") return copy.sort(byOrder);
  if (sort === "priority") {
    return copy.sort(
      (a, b) =>
        PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank ||
        byOrder(a, b),
    );
  }
  return copy.sort((a, b) => {
    const aTime = parseDateOnly(a.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
    const bTime = parseDateOnly(b.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
    return aTime - bTime || byOrder(a, b);
  });
}

export function groupTasks(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
  for (const task of tasks) groups[task.status].push(task);
  return groups;
}

export function getTaskStats(tasks: Task[], now = new Date()): TaskStats {
  const stats: TaskStats = {
    total: tasks.length,
    todo: 0,
    inProgress: 0,
    done: 0,
    overdue: 0,
    completionRate: 0,
  };

  for (const task of tasks) {
    if (task.status === "todo") stats.todo += 1;
    if (task.status === "in_progress") stats.inProgress += 1;
    if (task.status === "done") stats.done += 1;
    if (isOverdue(task, now)) stats.overdue += 1;
  }

  stats.completionRate =
    stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100);
  return stats;
}

export function getAllTags(tasks: Task[]): string[] {
  return Array.from(new Set(tasks.flatMap((task) => task.tags))).sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}

export function normalizeOrders(tasks: Task[]): Task[] {
  const updates = new Map<string, Task>();
  for (const status of TASK_STATUSES) {
    tasks
      .filter((task) => task.status === status)
      .sort(byOrder)
      .forEach((task, index) => {
        updates.set(task.id, task.order === index ? task : { ...task, order: index });
      });
  }
  return tasks.map((task) => updates.get(task.id) ?? task);
}

export function moveTaskToColumn(
  tasks: Task[],
  id: string,
  status: TaskStatus,
  index: number,
  now = new Date().toISOString(),
): Task[] {
  const moving = tasks.find((task) => task.id === id);
  if (!moving) return tasks;

  const sameColumn = moving.status === status;
  const target = tasks
    .filter((task) => task.status === status && task.id !== id)
    .sort(byOrder);
  const safeIndex = Math.max(0, Math.min(index, target.length));

  const updated: Task = {
    ...moving,
    status,
    updatedAt: now,
    completedAt:
      status === "done"
        ? moving.status === "done"
          ? moving.completedAt ?? now
          : now
        : undefined,
  };

  target.splice(safeIndex, 0, updated);

  const updates = new Map<string, Task>();
  target.forEach((task, position) => {
    updates.set(task.id, { ...task, order: position });
  });

  if (!sameColumn) {
    tasks
      .filter((task) => task.status === moving.status)
      .sort(byOrder)
      .forEach((task, position) => {
        if (task.id !== id) updates.set(task.id, { ...task, order: position });
      });
  }

  return tasks.map((task) => updates.get(task.id) ?? task);
}

export function reorderTask(tasks: Task[], id: string, overId: string): Task[] {
  const moving = tasks.find((task) => task.id === id);
  const over = tasks.find((task) => task.id === overId);
  if (!moving || !over || moving.status !== over.status) return tasks;

  const column = tasks.filter((task) => task.status === moving.status).sort(byOrder);
  const from = column.findIndex((task) => task.id === id);
  const to = column.findIndex((task) => task.id === overId);
  if (from < 0 || to < 0 || from === to) return tasks;

  const [item] = column.splice(from, 1);
  column.splice(to, 0, item);

  const updates = new Map(column.map((task, index) => [task.id, { ...task, order: index }]));
  return tasks.map((task) => updates.get(task.id) ?? task);
}

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}
