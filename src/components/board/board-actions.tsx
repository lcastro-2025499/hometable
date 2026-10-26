"use client";

import { useRef, type ChangeEvent } from "react";
import { DatabaseBackup, Download, FileUp, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toDateOnly } from "@/lib/task-utils";
import { importSchema } from "@/lib/validation";
import { useTaskStore } from "@/store/task-store";

export function BoardActions({ onCreate }: { onCreate: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceAll = useTaskStore((state) => state.replaceAll);

  const handleExport = () => {
    const tasks = useTaskStore.getState().tasks;
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tareas-${toDateOnly(new Date())}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Copia exportada", {
      description: `${tasks.length} ${tasks.length === 1 ? "tarea incluida" : "tareas incluidas"}.`,
    });
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const raw: unknown = JSON.parse(await file.text());
      const candidate = Array.isArray(raw) ? { tasks: raw } : raw;
      const parsed = importSchema.safeParse(candidate);

      if (!parsed.success) {
        toast.error("El archivo no tiene un formato válido.");
        return;
      }

      const previous = useTaskStore.getState().tasks;
      replaceAll(parsed.data.tasks);
      toast.success(
        `Se ${parsed.data.tasks.length === 1 ? "importó 1 tarea" : `importaron ${parsed.data.tasks.length} tareas`}`,
        {
          action: {
            label: "Deshacer",
            onClick: () => replaceAll(previous),
          },
        },
      );
    } catch {
      toast.error("No se pudo leer el archivo.");
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFile}
        aria-hidden="true"
        tabIndex={-1}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Copia de seguridad">
            <DatabaseBackup className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Datos del tablero</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleExport}>
            <Download className="size-4" /> Exportar a JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <FileUp className="size-4" /> Importar desde JSON
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            Los datos viven solo en este navegador.
          </p>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button size="sm" onClick={onCreate} className="gap-1.5" aria-label="Nueva tarea">
        <Plus className="size-4" />
        <span className="hidden sm:inline">Nueva tarea</span>
      </Button>
    </div>
  );
}
