import { ListTodo, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyBoardProps {
  onCreate: () => void;
  onLoadExamples: () => void;
}

export function EmptyBoard({ onCreate, onLoadExamples }: EmptyBoardProps) {
  return (
    <Card className="border-dashed bg-muted/30">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-background text-muted-foreground shadow-xs">
          <ListTodo className="size-6" aria-hidden="true" />
        </span>
        <div className="space-y-1">
          <h2 className="font-semibold">Tu tablero está vacío</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Crea tu primera tarea o carga un ejemplo para explorar prioridades,
            etiquetas, fechas y el arrastre entre columnas.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={onCreate}>
            <Plus className="size-4" /> Nueva tarea
          </Button>
          <Button variant="outline" onClick={onLoadExamples}>
            <Sparkles className="size-4" /> Cargar ejemplos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
