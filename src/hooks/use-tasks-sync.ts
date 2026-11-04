'use client';

import { useEffect, useRef, useState } from 'react';
import { useSupabase } from './use-supabase';
import { useTaskStore } from '@/store/task-store';
import type { Task } from '@/lib/types';

interface SyncStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastSync: string | null;
  error: string | null;
}

export function useTasksSync() {
  const supabase = useSupabase();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'connecting',
    lastSync: null,
    error: null,
  });
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const { setTasks, addTaskRemote, updateTaskRemote, deleteTaskRemote } = useTaskStore();
  
  // Cargar tareas iniciales desde Supabase
  useEffect(() => {
    let isMounted = true;
    
    async function loadTasks() {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (isMounted && data) {
          const tasks: Task[] = (data as Array<{
            id: string;
            title: string;
            description: string | null;
            status: string;
            priority: string;
            due_date: string | null;
            tags: string[] | null;
            order: number;
            created_at: string;
            updated_at: string;
            completed_at: string | null;
          }>).map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description || undefined,
            status: row.status as Task['status'],
            priority: row.priority as Task['priority'],
            dueDate: row.due_date || undefined,
            tags: row.tags || [],
            order: row.order,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            completedAt: row.completed_at || undefined,
          }));
          
          setTasks(tasks);
          setSyncStatus({
            status: 'connected',
            lastSync: new Date().toISOString(),
            error: null,
          });
        }
      } catch (error) {
        if (isMounted) {
          setSyncStatus({
            status: 'error',
            lastSync: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }
    
    loadTasks();
    
    return () => {
      isMounted = false;
    };
  }, [supabase, setTasks]);
  
  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    if (!supabase) return;
    
    const channel = supabase.channel('public:tasks');
    channelRef.current = channel;
    
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            title: string;
            description: string | null;
            status: string;
            priority: string;
            due_date: string | null;
            tags: string[] | null;
            order: number;
            created_at: string;
            updated_at: string;
            completed_at: string | null;
          };
          const task: Task = {
            id: row.id,
            title: row.title,
            description: row.description || undefined,
            status: row.status as Task['status'],
            priority: row.priority as Task['priority'],
            dueDate: row.due_date || undefined,
            tags: row.tags || [],
            order: row.order,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            completedAt: row.completed_at || undefined,
          };
          addTaskRemote(task);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            title: string;
            description: string | null;
            status: string;
            priority: string;
            due_date: string | null;
            tags: string[] | null;
            order: number;
            created_at: string;
            updated_at: string;
            completed_at: string | null;
          };
          const task: Task = {
            id: row.id,
            title: row.title,
            description: row.description || undefined,
            status: row.status as Task['status'],
            priority: row.priority as Task['priority'],
            dueDate: row.due_date || undefined,
            tags: row.tags || [],
            order: row.order,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            completedAt: row.completed_at || undefined,
          };
          updateTaskRemote(task);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          const row = payload.old as { id: string };
          deleteTaskRemote(row.id);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSyncStatus((prev) => ({
            ...prev,
            status: 'connected',
            error: null,
          }));
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setSyncStatus((prev) => ({
            ...prev,
            status: 'error',
            error: 'Connection error',
          }));
        }
      });
    
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [supabase, addTaskRemote, updateTaskRemote, deleteTaskRemote]);
  
  return syncStatus;
}