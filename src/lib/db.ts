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

/**
 * En producción no hay respaldo silencioso: si falta `DATABASE_URL` no se usa
 * `DIRECT_URL`. Caer a la conexión directa (puerto 5432) desde funciones
 * serverless agota las conexiones del proyecto y enmascara un despliegue mal
 * configurado. En local se acepta `DIRECT_URL` para trabajar sin pooler.
 */
const isProduction = process.env.NODE_ENV === "production";
const connectionString = isProduction
  ? process.env.DATABASE_URL
  : process.env.DATABASE_URL || process.env.DIRECT_URL;

function isSupabaseHost(hostname: string): boolean {
  return (
    hostname.endsWith(".supabase.co") ||
    hostname.endsWith(".supabase.com") ||
    hostname.endsWith(".supabase.net")
  );
}

/**
 * TLS de Postgres. Supabase usa una CA interna (también en el pooler), así que
 * la validación de cadena falla con `SELF_SIGNED_CERT_IN_CHAIN`. Si se
 * proporciona `SUPABASE_DB_CA_CERT` se valida contra ella; si no, se mantiene
 * el comportamiento histórico (cifrado sin validar la cadena) para no romper
 * la conexión. Descarga la CA en Supabase → Project Settings → Database →
 * SSL Configuration y guárdala en esa variable para validación completa.
 */
function sslConfig(value?: string): false | { ca?: string; rejectUnauthorized: boolean } {
  if (!value) return false;

  let hostname: string;
  try {
    hostname = new URL(value).hostname;
  } catch {
    return false;
  }

  if (!isSupabaseHost(hostname)) return false;

  const ca = process.env.SUPABASE_DB_CA_CERT?.replace(/\\n/g, "\n").trim();
  if (ca) return { ca, rejectUnauthorized: true };

  return { rejectUnauthorized: false };
}

const globalForDb = globalThis as unknown as { hometablePool?: Pool };

export const pool =
  globalForDb.hometablePool ??
  new Pool({
    connectionString,
    ssl: sslConfig(connectionString),
    max: isProduction ? 3 : 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.hometablePool = pool;
}
