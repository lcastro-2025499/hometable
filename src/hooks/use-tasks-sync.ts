'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTaskStore } from '@/store/task-store';
import { fetchRemoteTasks, replaceAllTasks } from '@/lib/tasks-sync';
import { reconcileTasks } from '@/lib/task-sync';
import { authClient } from '@/lib/auth-client';

export type SyncStatus =
  | 'local'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error de sincronización desconocido.';
}

export interface TasksSyncResult {
  status: SyncStatus;
  lastSync: string | null;
  error: string | null;
  isDirty: boolean;
  saveChanges: () => Promise<boolean>;
}

export function useTasksSync(): TasksSyncResult {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const setUserId = useTaskStore((state) => state.setUserId);
  const tasks = useTaskStore((state) => state.tasks);
  const isDirty = useTaskStore((state) => state.isDirty);
  const markSaved = useTaskStore((state) => state.markSaved);
  const syncFromSupabase = useTaskStore((state) => state.syncFromSupabase);

  useEffect(() => {
    setUserId(userId);
  }, [userId, setUserId]);

  const [state, setState] = useState<{
    status: SyncStatus;
    lastSync: string | null;
    error: string | null;
  }>(() => ({
    status: 'connecting',
    lastSync: null,
    error: null,
  }));

  const refresh = useCallback(async (silent = false) => {
    if (!userId) {
      setState({ status: 'local', lastSync: null, error: null });
      return;
    }

    if (!silent) {
      setState((current) => ({ ...current, status: 'connecting', error: null }));
    }

    try {
      const remote = await fetchRemoteTasks();
      const local = useTaskStore.getState().tasks;
      const { merged } = reconcileTasks(local, remote);

      syncFromSupabase(merged);

      setState({
        status: 'connected',
        lastSync: new Date().toISOString(),
        error: null,
      });
    } catch (error) {
      const online = typeof navigator === 'undefined' || navigator.onLine;
      setState((current) => ({
        ...current,
        status: online ? 'error' : 'disconnected',
        error: silent ? current.error : errorMessage(error),
      }));
    }
  }, [userId, syncFromSupabase]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Sincronización automática de entrada (pull) cada 30s si no hay cambios locales
  useEffect(() => {
    if (!userId || isDirty) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh(true);
      }
    }, 30000);

    return () => window.clearInterval(interval);
  }, [userId, isDirty, refresh]);

  // Advertencia de cambios sin guardar
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      return (e.returnValue = '');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const saveChanges = useCallback(async () => {
    if (!userId) return false;

    setState((current) => ({ ...current, status: 'connecting', error: null }));

    try {
      const success = await replaceAllTasks(tasks, userId);
      if (success) {
        markSaved();
        setState({
          status: 'connected',
          lastSync: new Date().toISOString(),
          error: null,
        });
        return true;
      }
      throw new Error('Fallo al guardar');
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        error: errorMessage(error),
      }));
      return false;
    }
  }, [userId, tasks, markSaved]);

  return { ...state, isDirty, saveChanges };
}
