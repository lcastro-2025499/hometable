"use client";

import { es } from "date-fns/locale";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { parseDateOnly, toDateOnly } from "@/lib/task-utils";
import { cn } from "@/lib/utils";

interface DueDatePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function DueDatePicker({ value, onChange }: DueDatePickerProps) {
  const date = parseDateOnly(value) ?? undefined;

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="size-4" />
            {date ? format(date, "PPP", { locale: es }) : "Sin fecha límite"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(next) => onChange(next ? toDateOnly(next) : "")}
            locale={es}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      {date ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange("")}
          aria-label="Quitar fecha límite"
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
