import { z } from "zod";
import { MAX_TAGS, MAX_TAG_LENGTH } from "./constants";
import { TASK_PRIORITIES, TASK_STATUSES } from "./types";

const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;

export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "El título es obligatorio.")
    .max(120, "Máximo 120 caracteres."),
  description: z.string().max(1000, "Máximo 1000 caracteres."),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: z
    .string()
    .refine(
      (value) => value === "" || dateOnlyRegex.test(value),
      "La fecha no es válida.",
    ),
  tags: z
    .array(z.string().min(1).max(MAX_TAG_LENGTH))
    .max(MAX_TAGS, `Máximo ${MAX_TAGS} etiquetas.`),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const importSchema = z.object({
  version: z.number().optional(),
  tasks: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        description: z.string().optional(),
        status: z.enum(TASK_STATUSES),
        priority: z.enum(TASK_PRIORITIES),
        dueDate: z.string().optional(),
        tags: z.array(z.string()).catch([]),
        order: z.number().catch(0),
        createdAt: z.string().catch(() => new Date().toISOString()),
        updatedAt: z.string().catch(() => new Date().toISOString()),
        completedAt: z.string().optional(),
      }),
    )
    .refine(
      (tasks) => new Set(tasks.map((task) => task.id)).size === tasks.length,
      "El archivo contiene tareas con identificadores duplicados.",
    ),
});

export type ImportPayload = z.infer<typeof importSchema>;
