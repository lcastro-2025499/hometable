'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSupabase } from './use-supabase';
import { useTaskStore } from '@/store/task-store';
import { flushSyncQueue, fetchRemoteTasks, pushTasks } from '@/lib/supabase-sync';
import { reconcileTasks } from '@/lib/task-sync';
import { rowToTask, type TaskRow } from '@/lib/task-mapper';
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

  const supabase = useSupabase();
  const syncFromSupabase = useTaskStore((state) => state.syncFromSupabase);
  const addTaskRemote = useTaskStore((state) => state.addTaskRemote);
  const updateTaskRemote = useTaskStore((state) => state.updateTaskRemote);
  const deleteTaskRemote = useTaskStore((state) => state.deleteTaskRemote);

  const [state, setState] = useState<SyncState>(() => ({
    status: supabase ? 'connecting' : 'local',
    lastSync: null,
    error: null,
    localOnly: [],
  }));

  const refresh = useCallback(async () => {
    const client = supabase;

    if (!client) {
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

      const remote = await fetchRemoteTasks(userId);
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
  }, [supabase, userId, syncFromSupabase]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('public:tasks')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tasks' },
        (payload) => {
          addTaskRemote(rowToTask(payload.new as TaskRow));
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks' },
        (payload) => {
          updateTaskRemote(rowToTask(payload.new as TaskRow));
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'tasks' },
        (payload) => {
          const row = payload.old as Partial<TaskRow>;
          if (row.id) deleteTaskRemote(row.id);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setState((current) => ({
            ...current,
            status: 'connected',
            lastSync: new Date().toISOString(),
            error: null,
          }));
          void flushSyncQueue(userId);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setState((current) => ({
            ...current,
            status: navigator.onLine ? 'error' : 'disconnected',
            error: navigator.onLine
              ? 'No se pudo mantener la conexión en tiempo real.'
              : null,
          }));
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId, addTaskRemote, updateTaskRemote, deleteTaskRemote]);

  useEffect(() => {
    if (!supabase) return;

    const handleOnline = () => {
      void refresh();
    };

    const handleOffline = () => {
      setState((current) => ({
        ...current,
        status: 'disconnected',
        error: null,
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [supabase, refresh]);

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
