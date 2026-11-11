import { describe, expect, it } from "vitest";

import { taskFormSchema } from "@/lib/validation";

const base = {
  title: "Comprar pan",
  description: "",
  status: "todo" as const,
  priority: "low" as const,
  dueDate: "",
  tags: ["hogar"],
};

describe("taskFormSchema", () => {
  it("acepta un formulario válido", () => {
    expect(taskFormSchema.safeParse(base).success).toBe(true);
  });

  it("recorta el título y exige que no esté vacío", () => {
    const parsed = taskFormSchema.parse({ ...base, title: "  Comprar pan  " });
    expect(parsed.title).toBe("Comprar pan");
    expect(taskFormSchema.safeParse({ ...base, title: "   " }).success).toBe(false);
  });

  it("rechaza fechas imposibles", () => {
    expect(taskFormSchema.safeParse({ ...base, dueDate: "2026-02-30" }).success).toBe(
      false,
    );
    expect(taskFormSchema.safeParse({ ...base, dueDate: "2026-02-28" }).success).toBe(
      true,
    );
  });

  it("rechaza estados y prioridades fuera del dominio", () => {
    expect(
      taskFormSchema.safeParse({ ...base, status: "archivada" }).success,
    ).toBe(false);
    expect(
      taskFormSchema.safeParse({ ...base, priority: "crítica" }).success,
    ).toBe(false);
  });

  it("limita el número de etiquetas", () => {
    expect(
      taskFormSchema.safeParse({
        ...base,
        tags: Array.from({ length: 25 }, (_, index) => `tag-${index}`),
      }).success,
    ).toBe(false);
  });
});
