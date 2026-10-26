export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type TaskSort = "manual" | "priority" | "dueDate";
export type DueFilter = "all" | "overdue" | "today" | "week" | "none";
export type PriorityFilter = "all" | TaskPriority;

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** Fecha sin hora en formato yyyy-MM-dd. */
  dueDate?: string;
  tags: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface NewTaskInput {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  tags: string[];
}

export interface TaskFilters {
  query: string;
  priority: PriorityFilter;
  tag: string | null;
  due: DueFilter;
  sort: TaskSort;
}

export interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
  completionRate: number;
}
