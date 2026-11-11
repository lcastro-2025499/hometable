import { pool } from "./db";

/**
 * Rate limit persistente en Postgres. Funciona entre instancias serverless sin
 * dependencias externas. La clave combina ruta, IP e identificador opcional.
 */

export type RateLimitScope = "register" | "verify" | "resend";

const LIMITS: Record<RateLimitScope, { limit: number; windowSeconds: number }> = {
  register: { limit: 5, windowSeconds: 15 * 60 },
  verify: { limit: 10, windowSeconds: 15 * 60 },
  resend: { limit: 3, windowSeconds: 15 * 60 },
};

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

function buildKey(scope: RateLimitScope, ip: string, identifier: string): string {
  const safeIdentifier = identifier.toLowerCase().slice(0, 120);
  return `${scope}:${ip}:${safeIdentifier}`.slice(0, 200);
}

export async function checkRateLimit(
  scope: RateLimitScope,
  ip: string,
  identifier = "-",
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = LIMITS[scope];
  const key = buildKey(scope, ip, identifier);

  const { rows } = await pool.query<{ count: number; elapsed: number }>(
    `insert into public.auth_rate_limit as r (key, window_started_at, count)
     values ($1, now(), 1)
     on conflict (key) do update set
       count = case
         when r.window_started_at < now() - make_interval(secs => $2) then 1
         else r.count + 1
       end,
       window_started_at = case
         when r.window_started_at < now() - make_interval(secs => $2) then now()
         else r.window_started_at
       end
     returning count, extract(epoch from (now() - window_started_at))::int as elapsed`,
    [key, windowSeconds],
  );

  const row = rows[0];
  if (!row) return { allowed: true };

  if (row.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, windowSeconds - row.elapsed),
    };
  }

  // Limpieza oportunista de ventanas antiguas.
  if (Math.random() < 0.01) {
    void pool
      .query(
        `delete from public.auth_rate_limit
         where window_started_at < now() - interval '1 day'`,
      )
      .catch(() => undefined);
  }

  return { allowed: true };
}
