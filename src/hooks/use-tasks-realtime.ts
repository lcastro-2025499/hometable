'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useTaskStore } from '@/store/task-store';
import { authClient } from '@/lib/auth-client';
import type { Task } from '@/lib/types';

export function useTasksRealtime() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const addTaskRemote = useTaskStore((s) => s.addTaskRemote);
  const updateTaskRemote = useTaskStore((s) => s.updateTaskRemote);
  const deleteTaskRemote = useTaskStore((s) => s.deleteTaskRemote);
  const userIdFromStore = useTaskStore((s) => s.userId);

  useEffect(() => {
    if (!userId || !userIdFromStore) return;

    const channel = supabase
      .channel(`tasks:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
          filter: `owner_id=eq.${userId}`,
        },
        (payload) => {
          const task = payload.new as Task;
          addTaskRemote(task);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `owner_id=eq.${userId}`,
        },
        (payload) => {
          const task = payload.new as Task;
          updateTaskRemote(task);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tasks',
          filter: `owner_id=eq.${userId}`,
        },
        (payload) => {
          const old = payload.old as Task;
          deleteTaskRemote(old.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userIdFromStore, addTaskRemote, updateTaskRemote, deleteTaskRemote]);
}
