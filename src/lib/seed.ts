import { addDays, subDays } from "date-fns";
import { toDateOnly } from "./task-utils";
import type { Task, TaskPriority, TaskStatus } from "./types";

interface Draft {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueInDays?: number;
  tags: string[];
}

function buildTask(
  draft: Draft,
  status: TaskStatus,
  order: number,
  now: Date,
): Task {
  const timestamp = now.toISOString();
  return {
    id: crypto.randomUUID(),
    title: draft.title,
    description: draft.description,
    status,
    priority: draft.priority,
    dueDate:
      typeof draft.dueInDays === "number"
        ? toDateOnly(addDays(now, draft.dueInDays))
        : undefined,
    tags: draft.tags,
    order,
    createdAt: subDays(now, 6).toISOString(),
    updatedAt: timestamp,
    completedAt: status === "done" ? subDays(now, 1).toISOString() : undefined,
  };
}

export function createExampleTasks(): Task[] {
  const now = new Date();

  const groups: Record<TaskStatus, Draft[]> = {
    todo: [
      {
        title: "Definir el alcance del MVP",
        description: "Listar las funcionalidades imprescindibles para la primera entrega.",
        priority: "high",
        dueInDays: 2,
        tags: ["producto"],
      },
      {
        title: "Diseñar los wireframes del tablero",
        description: "Vistas de lista, tablero y detalle de tarea.",
        priority: "medium",
        dueInDays: 5,
        tags: ["diseño", "ui"],
      },
      {
        title: "Revisar el feedback de las entrevistas",
        description: "Agrupar hallazgos por tema y detectar patrones.",
        priority: "urgent",
        dueInDays: -1,
        tags: ["investigación", "producto"],
      },
      {
        title: "Configurar la analítica de uso",
        priority: "low",
        tags: ["infra"],
      },
    ],
    in_progress: [
      {
        title: "Implementar arrastrar y soltar",
        description: "Reordenar tarjetas y moverlas entre columnas.",
        priority: "high",
        dueInDays: 1,
        tags: ["frontend"],
      },
      {
        title: "Escribir la guía de estilos",
        description: "Tokens de color, tipografía y espaciado.",
        priority: "medium",
        tags: ["docs", "diseño"],
      },
    ],
    done: [
      {
        title: "Crear el proyecto con Next.js",
        priority: "medium",
        dueInDays: -4,
        tags: ["infra"],
      },
      {
        title: "Instalar y configurar shadcn/ui",
        description: "Tema neutral con modo claro y oscuro.",
        priority: "low",
        dueInDays: -2,
        tags: ["ui"],
      },
    ],
  };

  return (Object.keys(groups) as TaskStatus[]).flatMap((status) =>
    groups[status].map((draft, order) => buildTask(draft, status, order, now)),
  );
}
