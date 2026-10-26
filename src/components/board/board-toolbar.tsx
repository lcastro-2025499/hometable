"use client";

import { RotateCcw, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DUE_FILTER_OPTIONS,
  PRIORITY_META,
  SORT_OPTIONS,
} from "@/lib/constants";
import {
  TASK_PRIORITIES,
  type DueFilter,
  type TaskFilters,
  type TaskSort,
} from "@/lib/types";

interface BoardToolbarProps {
  filters: TaskFilters;
  onChange: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void;
  onReset: () => void;
  tags: string[];
  visibleCount: number;
  totalCount: number;
}

export function BoardToolbar({
  filters,
  onChange,
  onReset,
  tags,
  visibleCount,
  totalCount,
}: BoardToolbarProps) {
  const hasActiveFilters =
    filters.query.trim().length > 0 ||
    filters.priority !== "all" ||
    filters.tag !== null ||
    filters.due !== "all" ||
    filters.sort !== "manual";

  return (
    <Card className="gap-0 py-0">
      <CardContent className="space-y-3 px-3 py-3">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={filters.query}
              onChange={(event) => onChange("query", event.target.value)}
              placeholder="Buscar tareas…"
              aria-label="Buscar tareas"
              className="pr-8 pl-8"
            />
            {filters.query ? (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onChange("query", "")}
                aria-label="Limpiar búsqueda"
                className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
              >
                <X className="size-3.5" />
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
            <Select
              value={filters.priority}
              onValueChange={(value) =>
                onChange("priority", value as TaskFilters["priority"])
              }
            >
              <SelectTrigger className="w-full" aria-label="Filtrar por prioridad">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                {TASK_PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {PRIORITY_META[priority].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.tag ?? "all"}
              onValueChange={(value) => onChange("tag", value === "all" ? null : value)}
            >
              <SelectTrigger className="w-full" aria-label="Filtrar por etiqueta">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las etiquetas</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.due}
              onValueChange={(value) => onChange("due", value as DueFilter)}
            >
              <SelectTrigger className="w-full" aria-label="Filtrar por fecha límite">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DUE_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.sort}
              onValueChange={(value) => onChange("sort", value as TaskSort)}
            >
              <SelectTrigger className="w-full" aria-label="Ordenar tareas">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>

            {hasActiveFilters ? (
              <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5">
                <RotateCcw className="size-3.5" /> Limpiar
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Mostrando <span className="font-medium text-foreground">{visibleCount}</span>{" "}
            de {totalCount} {totalCount === 1 ? "tarea" : "tareas"}
          </span>
          {filters.sort !== "manual" ? (
            <span>El arrastre se desactiva con el orden automático.</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
