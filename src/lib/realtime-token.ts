import { createHmac } from "node:crypto";

import { requireEnv } from "./env";

/**
 * Token de corta duración para Supabase Realtime.
 *
 * Supabase valida el JWT con el secreto del proyecto y aplica RLS usando
 * `auth.jwt() ->> 'sub'`. Solo concedemos lectura de las tareas propias: las
 * escrituras siguen pasando por `/api/tasks`, que usa la conexión directa a
 * Postgres y la sesión de Better Auth.
 */

const TOKEN_TTL_SECONDS = 15 * 60;

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

export interface RealtimeToken {
  token: string;
  expiresAt: number;
}

export function signRealtimeToken(userId: string): RealtimeToken {
  const secret = requireEnv("SUPABASE_JWT_SECRET");
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + TOKEN_TTL_SECONDS;

  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      sub: userId,
      role: "authenticated",
      aud: "authenticated",
      iat: issuedAt,
      exp: expiresAt,
    }),
  );

  const signature = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return { token: `${header}.${payload}.${signature}`, expiresAt };
}
