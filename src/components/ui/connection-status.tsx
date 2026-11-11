import { CloudCheck, CloudOff, TriangleAlert } from 'lucide-react';

import { useTasksSync, type SyncStatus } from '@/hooks/use-tasks-sync';

const STATUS_CONFIG: Record<
  SyncStatus,
  { label: string; icon: React.ReactNode }
> = {
  local: {
    label: 'Modo local',
    icon: <CloudOff className="size-3 text-muted-foreground" />,
  },
  connecting: {
    label: 'Sincronizado con Hometable',
    icon: <CloudCheck className="size-3 text-emerald-500" />,
  },
  connected: {
    label: 'Sincronizado con Hometable',
    icon: <CloudCheck className="size-3 text-emerald-500" />,
  },
  disconnected: {
    label: 'Sin conexión',
    icon: <CloudOff className="size-3 text-zinc-500" />,
  },
  error: {
    label: 'Error de conexión',
    icon: <TriangleAlert className="size-3 text-red-500" />,
  },
};

export function ConnectionStatus() {
  const { status } = useTasksSync();

  const config = STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs">
      {config.icon}
      <span className="text-muted-foreground">{config.label}</span>
    </div>
  );
}
