# Tareas: Autenticación obligatoria con Better Auth

**Código**: `400-better-auth-login` | **Estado**: Implementado y verificado |
**Fecha**: 2026-11-09 | **Actualizado**: 2026-11-11

---

## 1. Backend y base de datos

- [x] **T1.1** - Instalar `better-auth` y usar el pool de `pg` contra el pooler de
  Supabase.
- [x] **T1.2** - Crear el handler en `src/app/api/auth/[...all]/route.ts`.
- [x] **T1.3** - Versionar el esquema de Better Auth en
  `supabase/migrations/20261109151500_better_auth_tables.sql` (`user`, `session`,
  `account`, `verification`, `board` y `owner_id`).
- [x] **T1.4** - Activar RLS en las tablas de autenticación y revocar grants
  públicos (`20261110161929_enable_rls_auth_tables.sql`).
- [x] **T1.5** - Hacer `owner_id` obligatorio con FK a `public."user"` y crear el
  índice de `board.owner_id` (`20261112040000_*`).
- [x] **T1.6** - Documentar `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  `BETTER_AUTH_TRUSTED_ORIGINS`, `DATABASE_URL` y `SUPABASE_DB_CA_CERT` en
  `.env.example`.

## 2. Autenticación y UI

- [x] **T2.1** - Implementar `/login` con correo o usuario, contraseña y
  «Recordarme».
- [x] **T2.2** - Implementar `/register` con nombres, apellidos, usuario, email,
  contraseña, confirmación y reCAPTCHA v2.
- [x] **T2.3** - Compartir los esquemas Zod en `src/lib/auth-validation.ts`.
- [x] **T2.4** - Implementar `/verify-email` con OTP de 6 dígitos, reenvío y
  cooldown de 60 s.
- [x] **T2.5** - Implementar `/forgot-password` con enlace `?token=`/`?error=` y
  código pegado a mano.
- [x] **T2.6** - Añadir `useRedirectIfAuthenticated` para redirigir solo cuando
  Better Auth confirma la sesión.

## 3. Registro diferido

- [x] **T3.1** - Crear `public.pending_registration` con email/usuario únicos, hash
  de contraseña y OTP, expiración, intentos y cooldown.
- [x] **T3.2** - Implementar `src/lib/pending-registration.ts`: alta «el último
  gana», purga, verificación atómica y creación de `user` + `account`.
- [x] **T3.3** - Implementar `src/lib/pending-cookie.ts` con HMAC y cookie
  `httpOnly`.
- [x] **T3.4** - Crear `/api/auth/register`, `/api/auth/verify-email` y
  `/api/auth/resend-verification`.
- [x] **T3.5** - Activar `disableSignUp: true` para que el único alta sea el flujo
  con reCAPTCHA + OTP.
- [x] **T3.6** - Verificar reCAPTCHA en el servidor de forma fail-closed y enviar el
  OTP con Resend.

## 4. Seguridad e integración

- [x] **T4.1** - Sustituir `middleware.ts` por `src/proxy.ts` (convención de Next.js
  16), con rutas públicas exactas y exclusión de `/api`.
- [x] **T4.2** - Añadir CSP con nonce por petición y allowlist de reCAPTCHA y
  Supabase (incluido `wss://`).
- [x] **T4.3** - Exigir sesión y correo verificado en `/`, `/api/tasks` y
  `/api/realtime/token`.
- [x] **T4.4** - Exigir mismo origen en las escrituras.
- [x] **T4.5** - Implementar rate limit persistente en `public.auth_rate_limit` y
  usarlo también como almacenamiento de Better Auth.
- [x] **T4.6** - Mantener Realtime autenticado con JWT corto y RLS de solo lectura.
- [x] **T4.7** - Derivar `owner_id` de la sesión y revocar escrituras de PostgREST.
- [x] **T4.8** - Manejar `401` en el cliente: cerrar sesión y redirigir a `/login`.

## 5. Verificación

- [x] **T5.1** - `pnpm lint`.
- [x] **T5.2** - `pnpm exec next typegen`.
- [x] **T5.3** - `pnpm exec tsc --noEmit`.
- [x] **T5.4** - `pnpm test` (46 pruebas, incluidas `auth-validation` y
  `realtime-token`).
- [x] **T5.5** - `pnpm build`.
- [x] **T5.6** - CI en `.github/workflows/ci.yml`.
- [x] **T5.7** - QA manual de registro, OTP, login, recuperación y cierre de sesión.

---

## Estado actual

La autenticación, el registro diferido, la verificación por OTP, la recuperación de
contraseña, el rate limit persistente y el aislamiento de tareas están
implementados y verificados.

> El dominio `luuiscastro.me` está verificado en Resend y `EMAIL_FROM` usa
> `no-reply@luuiscastro.me`.

### Archivos principales

**Backend y seguridad**

- `src/lib/auth.ts` — configuración de Better Auth, `disableSignUp`, verificación
  obligatoria, sesión de 7 días, IP de confianza y rate limit persistente.
- `src/lib/auth-client.ts` — cliente con el plugin `username`.
- `src/lib/auth-server.ts` — `getSession()` para Server Components y rutas.
- `src/lib/db.ts` — pool único, `DATABASE_URL` obligatoria en producción y TLS.
- `src/lib/pending-registration.ts` — alta diferida, OTP, intentos y creación de la
  cuenta.
- `src/lib/pending-cookie.ts` — cookie firmada del pendiente.
- `src/lib/email.ts` — Resend y plantillas HTML con escape.
- `src/lib/recaptcha.ts` — verificación fail-closed.
- `src/lib/rate-limit.ts` — límites por ruta y adaptador de Better Auth.
- `src/lib/tasks-repo.ts` — CRUD parametrizado con `owner_id` de la sesión.
- `src/app/api/auth/[...all]/route.ts` — endpoints de Better Auth.
- `src/app/api/auth/register/route.ts` — registro con reCAPTCHA; solo crea el
  pendiente.
- `src/app/api/auth/verify-email/route.ts` — confirma el OTP y crea la cuenta.
- `src/app/api/auth/resend-verification/route.ts` — reenvío con cooldown.
- `src/app/api/tasks/route.ts` — API autenticada de tareas.
- `src/app/api/realtime/token/route.ts` — JWT de Realtime.
- `src/proxy.ts` — protección de rutas y CSP con nonce.

**Validación y UI**

- `src/lib/auth-validation.ts` — esquemas de login, registro, OTP, reenvío y reset.
- `src/app/login/page.tsx` — login con correo o usuario y «Recordarme».
- `src/app/register/page.tsx` — registro con reCAPTCHA.
- `src/app/verify-email/` — página y formulario de OTP.
- `src/app/forgot-password/page.tsx` — recuperación con enlace o código.
- `src/app/page.tsx` — guard de sesión y correo verificado.
- `src/components/user-menu.tsx` — menú de usuario con cierre de sesión.

**Estado y sincronización**

- `src/lib/types.ts` — `ownerId` en `Task`.
- `src/lib/task-mapper.ts` — fila de Postgres → `Task`.
- `src/lib/tasks-sync.ts` — cliente de `/api/tasks` y manejo de `401`.
- `src/hooks/use-tasks-sync.ts` — carga, sondeo, foco/online y `401`.
- `src/hooks/use-tasks-realtime.ts` — canal autenticado.
- `src/store/task-store.ts` — estado en memoria, sin `persist`.

**Migraciones**

- `20261109151500_better_auth_tables.sql`
- `20261110161929_enable_rls_auth_tables.sql`
- `20261110171312_lock_down_tasks.sql`
- `20261110200442_pending_registrations.sql`
- `20261111162025_auth_rate_limit.sql`
- `20261112040000_tasks_owner_not_null_and_board_index.sql`

### Correcciones respecto a versiones anteriores de este documento

- Ya **existe** una suite automatizada (Vitest) y CI; la afirmación anterior de que
  no había tests era incorrecta.
- Realtime **no se retiró**: se mantiene con JWT corto y RLS de solo lectura. El
  sondeo es el respaldo, no el único mecanismo.
- La protección de rutas vive en `src/proxy.ts` (Next.js 16), no en
  `src/middleware.ts`.
- No existen `src/lib/sync-queue.ts` ni cola offline.
- Las migraciones se renombraron a las versiones del historial remoto; los nombres
  antiguos ya no son válidos.
