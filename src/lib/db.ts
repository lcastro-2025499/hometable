import { Pool } from "pg";

/**
 * Pool único de PostgreSQL para todo el servidor (Better Auth y rutas de
 * tareas). Reutilizarlo evita agotar las conexiones directas de Supabase en
 * despliegues serverless.
 */

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

const needsSsl =
  process.env.NODE_ENV === "production" ||
  Boolean(process.env.DATABASE_URL?.includes("supabase.co")) ||
  Boolean(process.env.DATABASE_URL?.includes("pooler.supabase.com")) ||
  Boolean(process.env.DIRECT_URL?.includes("supabase.co")) ||
  Boolean(process.env.DIRECT_URL?.includes("pooler.supabase.com"));

const globalForDb = globalThis as unknown as { hometablePool?: Pool };

export const pool =
  globalForDb.hometablePool ??
  new Pool({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : false,
    max: process.env.NODE_ENV === "production" ? 3 : 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.hometablePool = pool;
}
