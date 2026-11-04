'use client';

import { useTasksSync } from '@/hooks/use-tasks-sync';

export function ConnectionStatus() {
  const { status, lastSync, error } = useTasksSync();
  
  const statusConfig = {
    connecting: {
      label: 'Conectando...',
      color: 'bg-yellow-500',
    },
    connected: {
      label: 'Sincronizado',
      color: 'bg-green-500',
    },
    disconnected: {
      label: 'Desconectado',
      color: 'bg-gray-500',
    },
    error: {
      label: 'Error',
      color: 'bg-red-500',
    },
  };
  
  const config = statusConfig[status];
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-sm">
      <span className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
      <span className="text-muted-foreground">{config.label}</span>
      {lastSync && (
        <span className="text-xs text-muted-foreground">
          · {new Date(lastSync).toLocaleTimeString()}
        </span>
      )}
      {error && (
        <span className="text-xs text-red-500" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}