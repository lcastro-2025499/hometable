import { describe, expect, it } from "vitest";

import type { Task } from "@/lib/types";
import {
  formatDueDate,
  getTaskStats,
  getAllTags,
  isDateOnly,
  isOverdue,
  moveTaskToColumn,
  normalizeText,
  normalizeOrders,
  parseDateOnly,
  reorderTask,
  sortTasks,
  toDateOnly,
} from "@/lib/task-utils";

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: `Tarea ${id}`,
    status: "todo",
    priority: "low",
    tags: [],
    order: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("fechas de solo día", () => {
  it("convierte texto a Date local y de vuelta sin desfase", () => {
    const date = parseDateOnly("2026-03-15");
    expect(date).not.toBeNull();
    expect(toDateOnly(date as Date)).toBe("2026-03-15");
  });

  it("rechaza fechas inexistentes o con formato incorrecto", () => {
    expect(isDateOnly("2026-02-31")).toBe(false);
    expect(isDateOnly("2026-13-01")).toBe(false);
    expect(isDateOnly("15/03/2026")).toBe(false);
    expect(isDateOnly("2026-03-15")).toBe(true);
  });

  it("formatea hoy, mañana y ayer en español", () => {
    const now = new Date(2026, 2, 15);
    expect(formatDueDate("2026-03-15", now)).toBe("Hoy");
    expect(formatDueDate("2026-03-16", now)).toBe("Mañana");
    expect(formatDueDate("2026-03-14", now)).toBe("Ayer");
    expect(formatDueDate(undefined, now)).toBe("");
  });
});

describe("isOverdue", () => {
  const now = new Date(2026, 2, 15, 18, 0);

  it("marca vencidas solo si no están completadas", () => {
    expect(isOverdue(task("a", { dueDate: "2026-03-14" }), now)).toBe(true);
    expect(isOverdue(task("a", { dueDate: "2026-03-15" }), now)).toBe(false);
    expect(
      isOverdue(task("a", { dueDate: "2026-03-14", status: "done" }), now),
    ).toBe(false);
  });
});

describe("normalizeText", () => {
  it("quita acentos y normaliza mayúsculas", () => {
    expect(normalizeText("  Programación ÁGIL ")).toBe("  programacion agil ");
  });
});

describe("sortTasks", () => {
  it("ordena por prioridad y desempata por orden manual", () => {
    const tasks = [
      task("baja", { priority: "low", order: 0 }),
      task("urgente", { priority: "urgent", order: 5 }),
      task("alta", { priority: "high", order: 1 }),
    ];

    expect(sortTasks(tasks, "priority").map((item) => item.id)).toEqual([
      "urgente",
      "alta",
      "baja",
    ]);
  });

  it("ordena por fecha límite y deja al final las tareas sin fecha", () => {
    const tasks = [
      task("sin", { order: 0 }),
      task("tarde", { dueDate: "2026-03-20", order: 1 }),
      task("pronto", { dueDate: "2026-03-16", order: 2 }),
    ];

    expect(sortTasks(tasks, "dueDate").map((item) => item.id)).toEqual([
      "pronto",
      "tarde",
      "sin",
    ]);
  });
});

describe("moveTaskToColumn", () => {
  it("mueve una tarea, renumera ambas columnas y fija completedAt al terminar", () => {
    const tasks = [
      task("a", { status: "todo", order: 0 }),
      task("b", { status: "todo", order: 1 }),
      task("c", { status: "done", order: 0 }),
    ];

    const moved = moveTaskToColumn(tasks, "a", "done", 0, "2026-03-15T10:00:00.000Z");

    expect(moved.find((item) => item.id === "a")).toMatchObject({
      status: "done",
      order: 0,
      completedAt: "2026-03-15T10:00:00.000Z",
    });
    expect(moved.find((item) => item.id === "b")?.order).toBe(0);
    expect(moved.find((item) => item.id === "c")?.order).toBe(1);
  });

  it("devuelve la misma lista si la tarea no existe", () => {
    const tasks = [task("a")];
    expect(moveTaskToColumn(tasks, "inexistente", "done", 0)).toBe(tasks);
  });
});

describe("reorderTask", () => {
  it("reordena dentro de la misma columna", () => {
    const tasks = [
      task("a", { order: 0 }),
      task("b", { order: 1 }),
      task("c", { order: 2 }),
    ];

    const reordered = reorderTask(tasks, "c", "a");
    expect(reordered.sort((a, b) => a.order - b.order).map((item) => item.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
    expect(reordered.find((item) => item.id === "c")?.order).toBe(0);
  });

  it("no reordena entre columnas distintas", () => {
    const tasks = [task("a"), task("b", { status: "done" })];
    expect(reorderTask(tasks, "a", "b")).toBe(tasks);
  });
});

describe("estadísticas y utilidades de tablero", () => {
  it("calcula totales, vencidas y porcentaje de completadas", () => {
    const now = new Date(2026, 2, 15);
    const stats = getTaskStats(
      [
        task("a", { status: "todo", dueDate: "2026-03-14" }),
        task("b", { status: "in_progress" }),
        task("c", { status: "done" }),
        task("d", { status: "done" }),
      ],
      now,
    );

    expect(stats).toEqual({
      total: 4,
      todo: 1,
      inProgress: 1,
      done: 2,
      overdue: 1,
      completionRate: 50,
    });
  });

  it("extrae etiquetas únicas ordenadas", () => {
    expect(
      getAllTags([
        task("a", { tags: ["hogar", "Urgente"] }),
        task("b", { tags: ["hogar"] }),
      ]),
    ).toEqual(["hogar", "Urgente"]);
  });

  it("normaliza los huecos en el orden por columna", () => {
    const normalized = normalizeOrders([
      task("a", { order: 6 }),
      task("b", { order: 2 }),
      task("c", { status: "done", order: 9 }),
    ]);

    expect(normalized.find((item) => item.id === "b")?.order).toBe(0);
    expect(normalized.find((item) => item.id === "a")?.order).toBe(1);
    expect(normalized.find((item) => item.id === "c")?.order).toBe(0);
  });
});
