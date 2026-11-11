"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function BoardActions({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" onClick={onCreate} className="gap-1.5 px-2.5 sm:px-3" aria-label="Nueva tarea">
        <Plus className="size-4" />
        <span className="hidden sm:inline">Nueva tarea</span>
      </Button>
    </div>
  );
}
