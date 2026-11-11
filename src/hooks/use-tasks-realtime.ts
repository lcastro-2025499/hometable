"use client";

import { useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { authClient } from "@/lib/auth-client";
import { getSupabaseClient } from "@/lib/supabase-client";
import { fetchRemoteTasks } from "@/lib/tasks-sync";
import { rowToTask, type TaskRow } from "@/lib/task-mapper";
import { useTaskStore } from "@/store/task-store";

const TOKEN_REFRESH_MS = 12 * 60 * 1000;
const RECONNECT_DELAY_MS = 5_000;
const SAFE_USER_ID = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Escucha los cambios de la propia cuenta por Supabase Realtime.
 *
 * El canal se autentica con un JWT corto emitido por `/api/realtime/token`; RLS
 * limita los eventos a las tareas cuyo `owner_id` coincide con `sub`. Si el
 * canal falla o no hay variables de entorno, el sondeo de `useTasksSync` sigue
 * manteniendo el tablero al día.
 */
export function useTasksRealtime() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;
  const storeUserId = useTaskStore((state) => state.userId);
  const addTaskRemote = useTaskStore((state) => state.addTaskRemote);
  const updateTaskRemote = useTaskStore((state) => state.updateTaskRemote);
  const deleteTaskRemote = useTaskStore((state) => state.deleteTaskRemote);
  const replaceFromServer = useTaskStore((state) => state.replaceFromServer);

  useEffect(() => {
    if (!userId || storeUserId !== userId || !SAFE_USER_ID.test(userId)) return;

    const client = getSupabaseClient();
    if (!client) return;

    let disposed = false;
    let channel: RealtimeChannel | null = null;
    let tokenTimer: number | undefined;
    let retryTimer: number | undefined;

    const applyToken = async (): Promise<boolean> => {
      const response = await fetch("/api/realtime/token", {
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) return false;

      const data = (await response.json().catch(() => null)) as {
        token?: unknown;
      } | null;

      if (typeof data?.token !== "string") return false;

      await Promise.resolve(client.realtime.setAuth(data.token));
      return true;
    };

    const syncOnce = async () => {
      try {
        replaceFromServer(await fetchRemoteTasks());
      } catch {
        // El sondeo de useTasksSync reintentará más adelante.
      }
    };

    const scheduleRetry = () => {
      if (retryTimer !== undefined || disposed) return;

      retryTimer = window.setTimeout(() => {
        retryTimer = undefined;
        if (channel) {
          void client.removeChannel(channel);
          channel = null;
        }
        void connect();
      }, RECONNECT_DELAY_MS);
    };

    const connect = async () => {
      if (disposed) return;

      const authenticated = await applyToken().catch(() => false);
      if (disposed) return;

      // Un fallo transitorio al pedir el token no debe dejar el canal muerto
      // hasta el siguiente montaje: se reintenta con el mismo backoff.
      if (!authenticated) {
        scheduleRetry();
        return;
      }

      channel = client
        .channel(`tasks:${userId}:${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "tasks",
            filter: `owner_id=eq.${userId}`,
          },
          (payload) => {
            addTaskRemote(rowToTask(payload.new as unknown as TaskRow));
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "tasks",
            filter: `owner_id=eq.${userId}`,
          },
          (payload) => {
            updateTaskRemote(rowToTask(payload.new as unknown as TaskRow));
          },
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "tasks",
            filter: `owner_id=eq.${userId}`,
          },
          (payload) => {
            const old = payload.old as unknown as { id?: unknown };
            if (typeof old.id === "string") deleteTaskRemote(old.id);
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            void syncOnce();

            if (tokenTimer === undefined) {
              tokenTimer = window.setInterval(() => {
                void applyToken().catch(() => undefined);
              }, TOKEN_REFRESH_MS);
            }
            return;
          }

          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            scheduleRetry();
          }
        });
    };

    void connect();

    return () => {
      disposed = true;

      if (tokenTimer !== undefined) window.clearInterval(tokenTimer);
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      if (channel) void client.removeChannel(channel);
    };
  }, [
    userId,
    storeUserId,
    addTaskRemote,
    updateTaskRemote,
    deleteTaskRemote,
    replaceFromServer,
  ]);
}
