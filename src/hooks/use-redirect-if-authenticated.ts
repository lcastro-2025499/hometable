"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

/**
 * Redirige a `/` cuando Better Auth confirma que hay una sesión activa.
 *
 * Sustituye a la redirección que antes hacía `proxy.ts` basándose solo en la
 * presencia de la cookie. Así una cookie caducada no provoca un bucle entre
 * `/` y `/login`.
 */
export function useRedirectIfAuthenticated(): void {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending || !session?.user) return;

    router.replace("/");
    router.refresh();
  }, [isPending, session?.user, router]);
}
