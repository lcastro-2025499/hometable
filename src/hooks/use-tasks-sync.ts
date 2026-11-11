"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import {
  fetchRemoteTasks,
  setSyncFailureHandler,
  setUnauthorizedHandler,
} from "@/lib/tasks-sync";
import { useTaskStore } from "@/store/task-store";

export type SyncStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.name === "TimeoutError") {
    return "El servidor tardó demasiado en responder.";
  }
  return "No se pudo conectar con el servidor.";
}

export interface TasksSyncResult {
  status: SyncStatus;
  lastSync: string | null;
  error: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

interface SyncState {
  status: SyncStatus;
  lastSync: string | null;
  error: string | null;
  isLoading: boolean;
}

const initialState: SyncState = {
  status: "connecting",
  lastSync: null,
  error: null,
  isLoading: true,
};

export function useTasksSync(): TasksSyncResult {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user?.id;
  const setUserId = useTaskStore((state) => state.setUserId);
  const replaceFromServer = useTaskStore((state) => state.replaceFromServer);

  const [state, setState] = useState<SyncState>(initialState);
  const inFlight = useRef(false);
  const userIdRef = useRef<string | undefined>(userId);
  userIdRef.current = userId;

  useEffect(() => {
    setUserId(userId);
  }, [userId, setUserId]);

  const refresh = useCallback(async () => {
    const currentUserId = userIdRef.current;

    if (!currentUserId) {
      setState({
        status: "error",
        lastSync: null,
        error: "No hay una sesión activa.",
        isLoading: false,
      });
      return;
    }

    if (inFlight.current) return;
    inFlight.current = true;

    try {
      const remote = await fetchRemoteTasks();
      replaceFromServer(remote);
      setState({
        status: "connected",
        lastSync: new Date().toISOString(),
        error: null,
        isLoading: false,
      });
    } catch (error) {
      const online = typeof navigator === "undefined" || navigator.onLine;
      setState((current) => ({
        ...current,
        status: online ? "error" : "disconnected",
        error: errorMessage(error),
        isLoading: false,
      }));
    } finally {
      inFlight.current = false;
    }
  }, [replaceFromServer]);

  // Carga inicial y cambio de cuenta.
  useEffect(() => {
    if (isPending) return;

    if (!userId) {
      setState({
        status: "error",
        lastSync: null,
        error: "No hay una sesión activa.",
        isLoading: false,
      });
      return;
    }

    setState((current) => ({
      ...current,
      status: current.lastSync ? current.status : "connecting",
      error: null,
      isLoading: current.lastSync === null,
    }));
    void refresh();
  }, [userId, isPending, refresh]);

  // Cualquier escritura fallida recarga el tablero desde el servidor y avisa.
  useEffect(() => {
    setSyncFailureHandler((message) => {
      toast.error(message);
      void refresh();
    });

    return () => setSyncFailureHandler(null);
  }, [refresh]);

  // Sesión caducada o revocada mientras la pestaña sigue abierta: se limpia la
  // cookie y se vuelve al login en lugar de dejar la UI mostrando datos viejos.
  useEffect(() => {
    let redirecting = false;

    setUnauthorizedHandler(() => {
      if (redirecting) return;
      redirecting = true;

      void authClient
        .signOut()
        .catch(() => undefined)
        .finally(() => {
          router.replace("/login");
          router.refresh();
        });
    });

    return () => setUnauthorizedHandler(null);
  }, [router]);

  // Respaldo por sondeo cuando Realtime no está disponible.
  useEffect(() => {
    if (!userId) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [userId, refresh]);

  // Recuperación al volver la conexión o al enfocar la pestaña.
  useEffect(() => {
    if (!userId) return;

    const handleOnline = () => void refresh();
    const handleFocus = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", handleFocus);
    };
  }, [userId, refresh]);

  return {
    status: state.status,
    lastSync: state.lastSync,
    error: state.error,
    isLoading: state.isLoading,
    refresh,
  };
}
