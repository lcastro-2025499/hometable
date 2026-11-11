import { useState } from 'react';
import { CloudCheck, CloudOff, Loader2, Save, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
    label: 'Conectando...',
    icon: <Loader2 className="size-3 animate-spin text-amber-500" />,
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
  const { status, isDirty, saveChanges } = useTasksSync();
  const [saving, setSaving] = useState(false);

  const config = STATUS_CONFIG[status];

  const handleSave = async () => {
    setSaving(true);
    await saveChanges();
    setSaving(false);
  };

  return (
    <div className="flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs">
      {isDirty ? (
        <Button
          variant="default"
          size="xs"
          className="h-6 gap-1.5 rounded-full px-3"
          onClick={handleSave}
          disabled={saving || status === 'connecting'}
        >
          {saving ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Save className="size-3" />
          )}
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      ) : (
        <>
          {config.icon}
          <span className="text-muted-foreground">{config.label}</span>
        </>
      )}
    </div>
  );
}
