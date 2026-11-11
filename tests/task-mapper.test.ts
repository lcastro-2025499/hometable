import { describe, expect, it } from "vitest";

import { rowToTask, type TaskRow } from "@/lib/task-mapper";

function row(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    title: "Comprar pan",
    description: null,
    status: "todo",
    priority: "low",
    due_date: null,
    tags: [],
    order: 0,
    created_at: "2026-03-01T10:00:00.000Z",
    updated_at: "2026-03-01T10:00:00.000Z",
    completed_at: null,
    owner_id: "user-1",
    ...overrides,
  };
}

describe("rowToTask", () => {
  it("convierte una fila completa al modelo de la app", () => {
    expect(
      rowToTask(
        row({
          description: "Integral",
          status: "in_progress",
          priority: "high",
          due_date: "2026-03-15",
          tags: ["hogar"],
          order: 2,
        }),
      ),
    ).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      title: "Comprar pan",
      description: "Integral",
      status: "in_progress",
      priority: "high",
      dueDate: "2026-03-15",
      tags: ["hogar"],
      order: 2,
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-01T10:00:00.000Z",
      completedAt: undefined,
      ownerId: "user-1",
    });
  });

  it("normaliza due_date a YYYY-MM-DD sin desfase de zona horaria", () => {
    expect(rowToTask(row({ due_date: "2026-03-15T00:00:00.000Z" })).dueDate).toBe(
      "2026-03-15",
    );
    expect(rowToTask(row({ due_date: "2026-03-15" })).dueDate).toBe("2026-03-15");
  });

  it("usa valores por defecto para estado, prioridad y etiquetas inválidos", () => {
    const task = rowToTask(
      row({ status: "archivada", priority: "crítica", tags: null as unknown as string[] }),
    );

    expect(task.status).toBe("todo");
    expect(task.priority).toBe("low");
    expect(task.tags).toEqual([]);
  });
});
