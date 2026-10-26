import type { DueFilter, TaskPriority, TaskSort, TaskStatus } from "./types";

export { TASK_STATUSES } from "./types";

export const STORAGE_KEY = "taskboard:v1";
export const MAX_TAGS = 8;
export const MAX_TAG_LENGTH = 24;

interface StatusMeta {
  label: string;
  description: string;
  dotClass: string;
  textClass: string;
  columnClass: string;
}

export const STATUS_META: Record<TaskStatus, StatusMeta> = {
  todo: {
    label: "Pendiente",
    description: "Sin empezar",
    dotClass: "bg-zinc-400",
    textClass: "text-muted-foreground",
    columnClass: "border-t-zinc-400 dark:border-t-zinc-600",
  },
  in_progress: {
    label: "En progreso",
    description: "Trabajando en ello",
    dotClass: "bg-blue-500",
    textClass: "text-blue-600 dark:text-blue-400",
    columnClass: "border-t-blue-500",
  },
  done: {
    label: "Hecha",
    description: "Completada",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-600 dark:text-emerald-400",
    columnClass: "border-t-emerald-500",
  },
};

interface PriorityMeta {
  label: string;
  rank: number;
  badgeClass: string;
  dotClass: string;
}

export const PRIORITY_META: Record<TaskPriority, PriorityMeta> = {
  low: {
    label: "Baja",
    rank: 0,
    badgeClass: "border-zinc-500/20 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
    dotClass: "bg-zinc-400",
  },
  medium: {
    label: "Media",
    rank: 1,
    badgeClass: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    dotClass: "bg-sky-500",
  },
  high: {
    label: "Alta",
    rank: 2,
    badgeClass: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dotClass: "bg-amber-500",
  },
  urgent: {
    label: "Urgente",
    rank: 3,
    badgeClass: "border-destructive/25 bg-destructive/10 text-destructive",
    dotClass: "bg-destructive",
  },
};

export const DUE_FILTER_OPTIONS: { value: DueFilter; label: string }[] = [
  { value: "all", label: "Cualquier fecha" },
  { value: "overdue", label: "Vencidas" },
  { value: "today", label: "Para hoy" },
  { value: "week", label: "Próximos 7 días" },
  { value: "none", label: "Sin fecha" },
];

export const SORT_OPTIONS: { value: TaskSort; label: string }[] = [
  { value: "manual", label: "Orden manual" },
  { value: "priority", label: "Prioridad" },
  { value: "dueDate", label: "Fecha límite" },
];
