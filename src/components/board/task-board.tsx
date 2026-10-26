"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Announcements,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ListTodo } from "lucide-react";
import { toast } from "sonner";

import { DeleteTaskDialog } from "@/components/tasks/delete-task-dialog";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { useHydrated } from "@/hooks/use-hydrated";
import { STATUS_META, STORAGE_KEY, TASK_STATUSES } from "@/lib/constants";
import {
  byOrder,
  filterTasks,
  getAllTags,
  groupTasks,
  isTaskStatus,
  moveTaskToColumn,
  reorderTask,
  sortTasks,
} from "@/lib/task-utils";
import type { Task, TaskFilters, TaskStatus } from "@/lib/types";
import { useTaskStore } from "@/store/task-store";
import { BoardActions } from "./board-actions";
import { BoardSkeleton } from "./board-skeleton";
import { BoardStats } from "./board-stats";
import { BoardToolbar } from "./board-toolbar";
import { EmptyBoard } from "./empty-board";
import { KanbanColumn } from "./kanban-column";
import { TaskCardOverlay } from "./task-card-overlay";

const initialFilters: TaskFilters = {
  query: "",
  priority: "all",
  tag: null,
  due: "all",
  sort: "manual",
};

function taskTitleFrom(data: unknown): string {
  if (data && typeof data === "object" && "title" in data) {
    return String((data as { title?: string }).title ?? "la tarea");
  }
  return "la tarea";
}

const announcements: Announcements = {
  onDragStart({ active }) {
    return `Has tomado «${taskTitleFrom(active.data.current)}». Usa las flechas para moverla y Espacio para soltarla.`;
  },
  onDragOver({ active }) {
    return `«${taskTitleFrom(active.data.current)}» se está moviendo a una nueva posición.`;
  },
  onDragEnd({ active }) {
    return `«${taskTitleFrom(active.data.current)}» se ha soltado.`;
  },
  onDragCancel({ active }) {
    return `Has cancelado el movimiento de «${taskTitleFrom(active.data.current)}».`;
  },
};

export function TaskBoard() {
  const hydrated = useHydrated();
  const tasks = useTaskStore((state) => state.tasks);
  const setTasks = useTaskStore((state) => state.setTasks);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const restoreTask = useTaskStore((state) => state.restoreTask);
  const addTasks = useTaskStore((state) => state.addTasks);
  const duplicateTask = useTaskStore((state) => state.duplicateTask);
  const moveTask = useTaskStore((state) => state.moveTask);
  const toggleComplete = useTaskStore((state) => state.toggleComplete);
  const clearCompleted = useTaskStore((state) => state.clearCompleted);
  const loadExamples = useTaskStore((state) => state.loadExamples);

  const [filters, setFilters] = useState<TaskFilters>(initialFilters);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("todo");
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [draft, setDraft] = useState<Task[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        void useTaskStore.persist.rehydrate();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const canDrag = filters.sort === "manual";
  const displayedTasks = draft ?? tasks;

  const visibleTasks = useMemo(
    () =>
      hydrated
        ? sortTasks(filterTasks(displayedTasks, filters), filters.sort)
        : [],
    [hydrated, displayedTasks, filters],
  );
  const grouped = useMemo(() => groupTasks(visibleTasks), [visibleTasks]);
  const totalsByStatus = useMemo(
    () => groupTasks(displayedTasks),
    [displayedTasks],
  );
  const tags = useMemo(() => getAllTags(tasks), [tasks]);

  const activeTask = activeId
    ? (displayedTasks.find((task) => task.id === activeId) ?? null)
    : null;

  const handleFilterChange = <K extends keyof TaskFilters,>(
    key: K,
    value: TaskFilters[K],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const resetFilters = () => setFilters(initialFilters);

  const openCreate = (status: TaskStatus = "todo") => {
    setEditingTask(null);
    setDefaultStatus(status);
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setDefaultStatus(task.status);
    setDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const removed = deleteTask(deleteTarget.id);
    setDeleteTarget(null);
    if (removed) {
      toast.success("Tarea eliminada", {
        action: {
          label: "Deshacer",
          onClick: () => restoreTask(removed),
        },
      });
    }
  };

  const handleDuplicate = (task: Task) => {
    const copy = duplicateTask(task.id);
    if (copy) toast.success("Tarea duplicada");
  };

  const handleMove = (task: Task, status: TaskStatus) => {
    moveTask(task.id, status);
    toast.success(`Movida a «${STATUS_META[status].label}»`);
  };

  const handleClearCompleted = () => {
    const removed = clearCompleted();
    if (removed.length === 0) return;
    toast.success(
      removed.length === 1
        ? "Tarea completada eliminada"
        : `${removed.length} tareas completadas eliminadas`,
      {
        action: {
          label: "Deshacer",
          onClick: () => addTasks(removed),
        },
      },
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setDraft(tasks);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTaskId = String(active.id);
    const overId = String(over.id);
    if (activeTaskId === overId) return;

    setDraft((current) => {
      const list = current ?? tasks;
      const moving = list.find((task) => task.id === activeTaskId);
      if (!moving) return list;

      let targetStatus: TaskStatus;
      let targetIndex: number;

      if (isTaskStatus(overId)) {
        targetStatus = overId;
        targetIndex = Number.MAX_SAFE_INTEGER;
      } else {
        const overTask = list.find((task) => task.id === overId);
        if (!overTask) return list;
        targetStatus = overTask.status;
        targetIndex = list
          .filter(
            (task) => task.status === targetStatus && task.id !== activeTaskId,
          )
          .sort(byOrder)
          .findIndex((task) => task.id === overId);
        if (targetIndex < 0) targetIndex = Number.MAX_SAFE_INTEGER;
      }

      if (targetStatus === moving.status) return list;
      return moveTaskToColumn(list, activeTaskId, targetStatus, targetIndex);
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const current = draft ?? tasks;
    setDraft(null);
    setActiveId(null);
    if (!over) return;

    const activeTaskId = String(active.id);
    const overId = String(over.id);

    if (isTaskStatus(overId)) {
      const columnTask = current.find((task) => task.id === activeTaskId);
      const next =
        columnTask && columnTask.status !== overId
          ? moveTaskToColumn(
              current,
              activeTaskId,
              overId,
              Number.MAX_SAFE_INTEGER,
            )
          : current;
      setTasks(next);
      return;
    }

    const moving = current.find((task) => task.id === activeTaskId);
    const overTask = current.find((task) => task.id === overId);
    if (!moving || !overTask) {
      setTasks(current);
      return;
    }

    const next =
      moving.status === overTask.status
        ? reorderTask(current, activeTaskId, overId)
        : moveTaskToColumn(
            current,
            activeTaskId,
            overTask.status,
            Number.MAX_SAFE_INTEGER,
          );

    setTasks(next);
  };

  const handleDragCancel = () => {
    setDraft(null);
    setActiveId(null);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
          <div className="mr-auto flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
              <ListTodo className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base leading-tight font-semibold">
                Tablero de tareas
              </h1>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                Organiza, prioriza y avanza.
              </p>
            </div>
          </div>
          <BoardActions onCreate={() => openCreate("todo")} />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6">
        {!hydrated ? (
          <BoardSkeleton />
        ) : (
          <div className="space-y-5">
            <BoardStats tasks={tasks} />

            <BoardToolbar
              filters={filters}
              onChange={handleFilterChange}
              onReset={resetFilters}
              tags={tags}
              visibleCount={visibleTasks.length}
              totalCount={tasks.length}
            />

            {tasks.length === 0 ? (
              <EmptyBoard
                onCreate={() => openCreate("todo")}
                onLoadExamples={() => {
                  loadExamples();
                  toast.success("Datos de ejemplo cargados");
                }}
              />
            ) : null}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              accessibility={{ announcements }}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:items-start md:overflow-visible">
                {TASK_STATUSES.map((status) => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    tasks={grouped[status]}
                    totalInColumn={totalsByStatus[status].length}
                    canDrag={canDrag}
                    onAdd={openCreate}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                    onDuplicate={handleDuplicate}
                    onMove={handleMove}
                    onToggleComplete={(task) => toggleComplete(task.id)}
                    onClearCompleted={
                      status === "done" ? handleClearCompleted : undefined
                    }
                  />
                ))}
              </div>

              <DragOverlay>
                {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </main>

      <footer className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
        Tus tareas se guardan en este navegador (localStorage). Exporta una copia
        para no perderlas.
      </footer>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        defaultStatus={defaultStatus}
      />

      <DeleteTaskDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        task={deleteTarget}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
