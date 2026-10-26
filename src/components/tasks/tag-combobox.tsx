"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MAX_TAGS, MAX_TAG_LENGTH } from "@/lib/constants";
import { normalizeText } from "@/lib/task-utils";

interface TagComboboxProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}

export function TagCombobox({ value, onChange, suggestions }: TagComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const cleanQuery = query.trim().slice(0, MAX_TAG_LENGTH);
  const available = suggestions.filter(
    (tag) =>
      !value.includes(tag) && normalizeText(tag).includes(normalizeText(query.trim())),
  );
  const canCreate =
    cleanQuery.length > 0 &&
    !value.some((tag) => normalizeText(tag) === normalizeText(cleanQuery)) &&
    !suggestions.some((tag) => normalizeText(tag) === normalizeText(cleanQuery)) &&
    value.length < MAX_TAGS;

  const addTag = (tag: string) => {
    const clean = tag.trim().slice(0, MAX_TAG_LENGTH);
    if (!clean || value.includes(clean) || value.length >= MAX_TAGS) return;
    onChange([...value, clean]);
    setQuery("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((item) => item !== tag));
  };

  return (
    <div className="space-y-2">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1 font-normal">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`Quitar la etiqueta ${tag}`}
                className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-expanded={open}
            disabled={value.length >= MAX_TAGS}
            className="w-full justify-between font-normal text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <Plus className="size-4" />
              {value.length >= MAX_TAGS ? "Límite de etiquetas alcanzado" : "Añadir etiqueta"}
            </span>
            <ChevronsUpDown className="size-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar o crear etiqueta…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              {available.length > 0 ? (
                <CommandGroup heading="Etiquetas">
                  {available.map((tag) => (
                    <CommandItem key={tag} value={tag} onSelect={() => addTag(tag)}>
                      <Check className="size-4 opacity-0" />
                      {tag}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
              {canCreate ? (
                <CommandGroup heading="Crear">
                  <CommandItem
                    value={`crear-${cleanQuery}`}
                    onSelect={() => addTag(cleanQuery)}
                  >
                    <Plus className="size-4" />
                    Crear «{cleanQuery}»
                  </CommandItem>
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
