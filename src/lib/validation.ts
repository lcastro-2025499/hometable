import { z } from "zod";

import {
  MAX_DESCRIPTION_LENGTH,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  MAX_TITLE_LENGTH,
} from "./constants";
import { isDateOnly } from "./task-utils";
import { TASK_PRIORITIES, TASK_STATUSES } from "./types";

export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "El título es obligatorio.")
    .max(MAX_TITLE_LENGTH, `Máximo ${MAX_TITLE_LENGTH} caracteres.`),
  description: z
    .string()
    .max(
      MAX_DESCRIPTION_LENGTH,
      `Máximo ${MAX_DESCRIPTION_LENGTH} caracteres.`,
    ),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: z
    .string()
    .refine(
      (value) => value === "" || isDateOnly(value),
      "La fecha no es válida.",
    ),
  tags: z
    .array(z.string().min(1).max(MAX_TAG_LENGTH))
    .max(MAX_TAGS, `Máximo ${MAX_TAGS} etiquetas.`),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;
