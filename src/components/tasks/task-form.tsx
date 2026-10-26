"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MAX_TAGS, PRIORITY_META, STATUS_META } from "@/lib/constants";
import { getAllTags } from "@/lib/task-utils";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from "@/lib/types";
import { taskFormSchema, type TaskFormValues } from "@/lib/validation";
import { useTaskStore } from "@/store/task-store";
import { DueDatePicker } from "./due-date-picker";
import { TagCombobox } from "./tag-combobox";

interface TaskFormProps {
  task: Task | null;
  defaultStatus: TaskStatus;
  onDone: () => void;
}

export function TaskForm({ task, defaultStatus, onDone }: TaskFormProps) {
  const addTask = useTaskStore((state) => state.addTask);
  const updateTask = useTaskStore((state) => state.updateTask);
  const tasks = useTaskStore((state) => state.tasks);
  const suggestions = getAllTags(tasks);

  const defaultValues: TaskFormValues = {
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? defaultStatus,
    priority: task?.priority ?? "medium",
    dueDate: task?.dueDate ?? "",
    tags: task?.tags ?? [],
  };

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues,
    mode: "onBlur",
  });

  const { errors } = form.formState;

  const onSubmit = (values: TaskFormValues) => {
    const input = {
      title: values.title,
      description: values.description || undefined,
      status: values.status,
      priority: values.priority,
      dueDate: values.dueDate || undefined,
      tags: values.tags,
    };

    if (task) {
      updateTask(task.id, input);
      toast.success("Tarea actualizada");
    } else {
      addTask(input);
      toast.success("Tarea creada");
    }

    onDone();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FieldGroup className="gap-4">
        <Field data-invalid={Boolean(errors.title)}>
          <FieldLabel htmlFor="task-title">Título</FieldLabel>
          <Input
            id="task-title"
            autoFocus
            placeholder="¿Qué hay que hacer?"
            aria-invalid={Boolean(errors.title)}
            {...form.register("title")}
          />
          {errors.title ? <FieldError>{errors.title.message}</FieldError> : null}
        </Field>

        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="task-description">
            Descripción{" "}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </FieldLabel>
          <Textarea
            id="task-description"
            rows={3}
            placeholder="Añade contexto, enlaces o criterios de aceptación…"
            aria-invalid={Boolean(errors.description)}
            {...form.register("description")}
          />
          {errors.description ? (
            <FieldError>{errors.description.message}</FieldError>
          ) : null}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="task-status">Estado</FieldLabel>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="task-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_META[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="task-priority">Prioridad</FieldLabel>
            <Controller
              control={form.control}
              name="priority"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="task-priority" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {PRIORITY_META[priority].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel>Fecha límite</FieldLabel>
          <Controller
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <DueDatePicker
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>

        <Field data-invalid={Boolean(errors.tags)}>
          <FieldLabel>Etiquetas</FieldLabel>
          <Controller
            control={form.control}
            name="tags"
            render={({ field }) => (
              <TagCombobox
                value={field.value}
                onChange={field.onChange}
                suggestions={suggestions}
              />
            )}
          />
          <FieldDescription>
            Escribe y pulsa Enter para crear una etiqueta. Máximo {MAX_TAGS}.
          </FieldDescription>
          {errors.tags ? <FieldError>{errors.tags.message}</FieldError> : null}
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit">{task ? "Guardar cambios" : "Crear tarea"}</Button>
      </DialogFooter>
    </form>
  );
}
