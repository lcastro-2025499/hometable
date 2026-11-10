import { headers } from "next/headers";

import { auth } from "./auth";

/**
 * Devuelve la sesión de Better Auth para la petición actual. Solo puede usarse
 * desde código de servidor (Server Components, Server Actions o Route Handlers).
 */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export type AuthSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;
