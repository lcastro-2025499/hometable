import { CloudCheck, CloudOff, TriangleAlert } from "lucide-react";

import type { SyncStatus } from "@/hooks/use-tasks-sync";

const STATUS_CONFIG: Record<
  SyncStatus,
  { label: string; icon: React.ReactNode }
> = {
  connecting: {
    label: "Conectando…",
    icon: <CloudOff className="size-3 text-muted-foreground" />,
  },
  connected: {
    label: "Sincronizado",
    icon: <CloudCheck className="size-3 text-emerald-500" />,
  },
  disconnected: {
    label: "Sin conexión",
    icon: <CloudOff className="size-3 text-zinc-500" />,
  },
  error: {
    label: "Error de conexión",
    icon: <TriangleAlert className="size-3 text-red-500" />,
  },
};

export function ConnectionStatus({ status }: { status: SyncStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
      {config.icon}
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  );
}
