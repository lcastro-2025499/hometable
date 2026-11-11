import { Pool, types } from "pg";

/**
 * Las columnas `date` (por ejemplo `tasks.due_date`) representan un día sin
 * hora. Por defecto el driver las convierte a `Date` y, al serializarlas,
 * acaban como `2026-11-28T06:00:00.000Z`, que ya no encaja con el formato
 * `YYYY-MM-DD` que usa la aplicación. Devolverlas como texto evita esa
 * conversión y cualquier desfase de zona horaria.
 *
 * Los tipos `timestamp`/`timestamptz` no se tocan: esos sí son instantes y se
 * serializan como ISO.
 */
types.setTypeParser(types.builtins.DATE, (value: string) => value);

/**
 * Pool único de PostgreSQL para todo el servidor (Better Auth y rutas de
 * tareas).
 *
 * En despliegues serverless se usa primero `DATABASE_URL`, que debe apuntar al
 * pooler de Supabase (puerto 6543) para no agotar las conexiones directas.
 * `DIRECT_URL` queda solo como respaldo para entornos locales o tareas de
 * migración. Reutilizar el pool entre invocaciones evita abrir una conexión
 * nueva por petición.
 */

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

/** Solo los hosts de Supabase necesitan TLS con su CA interna. */
function needsSsl(value?: string): boolean {
  if (!value) return false;

  try {
    const { hostname } = new URL(value);
    return (
      hostname.endsWith(".supabase.co") ||
      hostname.endsWith(".supabase.com") ||
      hostname.endsWith(".supabase.net")
    );
  } catch {
    return false;
  }
}

const globalForDb = globalThis as unknown as { hometablePool?: Pool };

export const pool =
  globalForDb.hometablePool ??
  new Pool({
    connectionString,
    ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : false,
    max: process.env.NODE_ENV === "production" ? 3 : 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.hometablePool = pool;
}
