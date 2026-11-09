'use client';

import { useState } from 'react';
import { Cloud, CloudOff, Loader2, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTasksSync, type SyncStatus } from '@/hooks/use-tasks-sync';

const STATUS_CONFIG: Record<
  SyncStatus,
  { label: string; dotClass: string; title: string }
> = {
  local: {
    label: 'Solo local',
    dotClass: 'bg-zinc-400',
    title: 'Supabase no está configurado: los datos viven en este navegador.',
  },
  connecting: {
    label: 'Conectando...',
    dotClass: 'bg-amber-500',
    title: 'Conectando con Supabase.',
  },
  connected: {
    label: 'Sincronizado',
    dotClass: 'bg-emerald-500',
    title: 'Los cambios se sincronizan en tiempo real.',
  },
  disconnected: {
    label: 'Sin conexión',
    dotClass: 'bg-zinc-500',
    title: 'Sin conexión: los cambios se guardan en local y se enviarán al reconectar.',
  },
  error: {
    label: 'Error',
    dotClass: 'bg-red-500',
    title: 'No se pudo sincronizar. Se reintentará automáticamente.',
  },
};

export function ConnectionStatus() {
  const { status, lastSync, error, localOnly, migrateLocalTasks } =
    useTasksSync();
  const [manualOpen, setManualOpen] = useState(false);
  const [dismissedCount, setDismissedCount] = useState<number | null>(null);
  const [migrating, setMigrating] = useState(false);

  const config = STATUS_CONFIG[status];
  const autoOpen =
    localOnly.length > 0 && dismissedCount !== localOnly.length;
  const migrationOpen = manualOpen || autoOpen;

  const handleMigrate = async () => {
    setMigrating(true);
    const success = await migrateLocalTasks(localOnly);
    setMigrating(false);
    if (success) {
      setManualOpen(false);
      setDismissedCount(0);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setManualOpen(open);
    if (!open) setDismissedCount(localOnly.length);
  };

  return (
    <>
      <div
        className="flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs"
        title={error ?? config.title}
        aria-live="polite"
      >
        {status === 'connecting' ? (
          <Loader2 className="size-3 animate-spin text-amber-500" aria-hidden="true" />
        ) : status === 'error' ? (
          <TriangleAlert className="size-3 text-red-500" aria-hidden="true" />
        ) : status === 'connected' ? (
          <Cloud className="size-3 text-emerald-500" aria-hidden="true" />
        ) : (
          <CloudOff className="size-3 text-muted-foreground" aria-hidden="true" />
        )}
        <span className={`size-1.5 rounded-full ${config.dotClass}`} aria-hidden="true" />
        <span className="text-muted-foreground">{config.label}</span>
        {lastSync && status === 'connected' ? (
          <span className="hidden text-muted-foreground/70 sm:inline">
            · {new Date(lastSync).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : null}
        {localOnly.length > 0 ? (
          <Button
            variant="ghost"
            size="xs"
            className="ml-1"
            onClick={() => setManualOpen(true)}
          >
            Sincronizar {localOnly.length}
          </Button>
        ) : null}
      </div>

      <Dialog open={migrationOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sincronizar tareas locales</DialogTitle>
            <DialogDescription>
              Hay {localOnly.length}{' '}
              {localOnly.length === 1 ? 'tarea' : 'tareas'} que todavía no existen
              en Supabase. ¿Quieres subirlas para que aparezcan en tus otros
              dispositivos?
            </DialogDescription>
          </DialogHeader>

          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-sm">
            {localOnly.slice(0, 6).map((task) => (
              <li key={task.id} className="truncate">
                {task.title}
              </li>
            ))}
            {localOnly.length > 6 ? (
              <li className="text-muted-foreground">
                y {localOnly.length - 6} más…
              </li>
            ) : null}
          </ul>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={migrating}
            >
              Ahora no
            </Button>
            <Button onClick={handleMigrate} disabled={migrating}>
              {migrating ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Subir tareas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
