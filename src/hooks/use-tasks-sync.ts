'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTaskStore } from '@/store/task-store';
import { fetchRemoteTasks, flushSyncQueue, pushTasks } from '@/lib/tasks-sync';
import { reconcileTasks } from '@/lib/task-sync';
import { authClient } from '@/lib/auth-client';
import type { Task } from '@/lib/types';

export type SyncStatus =
  | 'local'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface SyncState {
  status: SyncStatus;
  lastSync: string | null;
  error: string | null;
  localOnly: Task[];
}

export interface TasksSyncResult extends SyncState {
  migrateLocalTasks: (tasks: Task[]) => Promise<boolean>;
}

const POLL_INTERVAL_MS = 2_000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error de sincronización desconocido.';
}

export function useTasksSync(): TasksSyncResult {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const setUserId = useTaskStore((state) => state.setUserId);

  useEffect(() => {
    setUserId(userId);
  }, [userId, setUserId]);

  const syncFromSupabase = useTaskStore((state) => state.syncFromSupabase);

  const [state, setState] = useState<SyncState>(() => ({
    status: 'connecting',
    lastSync: null,
    error: null,
    localOnly: [],
  }));

  const refresh = useCallback(async () => {
    if (!userId) {
      setState({
        status: 'local',
        lastSync: null,
        error: null,
        localOnly: [],
      });
      return;
    }

    setState((current) => ({
      ...current,
      status: 'connecting',
      error: null,
    }));

    try {
      await flushSyncQueue(userId);

      const remote = await fetchRemoteTasks();
      const local = useTaskStore.getState().tasks;
      const { merged, localOnly, localNewer } = reconcileTasks(local, remote);

      syncFromSupabase(merged);

      if (localNewer.length > 0) {
        void pushTasks(localNewer, userId);
      }

      setState({
        status: 'connected',
        lastSync: new Date().toISOString(),
        error: null,
        localOnly,
      });
    } catch (error) {
      const online = typeof navigator === 'undefined' || navigator.onLine;

      setState((current) => ({
        ...current,
        status: online ? 'error' : 'disconnected',
        lastSync: null,
        error: errorMessage(error),
      }));
    }
  }, [userId, syncFromSupabase]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Sincronización periódica: sustituye la suscripción Realtime (que exigía
  // exponer `tasks` al cliente de Supabase) por sondeo autenticado.
  useEffect(() => {
    if (!userId) return;

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void refresh();
    };

    const interval = window.setInterval(tick, POLL_INTERVAL_MS);

    const handleOffline = () => {
      setState((current) => ({
        ...current,
        status: 'disconnected',
        error: null,
      }));
    };

    window.addEventListener('online', tick);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', tick);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', tick);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', tick);
    };
  }, [userId, refresh]);

  const migrateLocalTasks = useCallback(async (tasks: Task[]) => {
    if (tasks.length === 0) return true;

    const success = await pushTasks(tasks, userId);

    setState((current) => ({
      ...current,
      status: success
        ? 'connected'
        : typeof navigator !== 'undefined' && !navigator.onLine
          ? 'disconnected'
          : 'error',
      lastSync: success ? new Date().toISOString() : current.lastSync,
      error: success ? null : 'No se pudieron subir las tareas locales.',
      localOnly: success ? [] : current.localOnly,
    }));

    return success;
  }, [userId]);

  return { ...state, migrateLocalTasks };
}
