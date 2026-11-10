# Tareas: Autenticación obligatoria con Better Auth

**Código**: `400-better-auth-login` | **Fecha**: 2026-11-09

---

## 1. Backend y Base de Datos

- [x] Tarea 1.1: Instalar `better-auth` y adaptador PostgreSQL para Supabase.
- [x] Tarea 1.2: Crear handler en `src/app/api/auth/[...all]/route.ts`.
- [x] Tarea 1.3: Ejecutar migraciones de Better Auth en Supabase.
- [x] Tarea 1.4: Actualizar RLS de tabla `tasks` (vincular `owner_id` obligatorio).
- [x] Tarea 1.5: Configurar variables de entorno (secrets y site keys).

## 2. Autenticación y UI

- [x] Tarea 2.1: Crear componentes de formulario `AuthForm` (login, registro).
- [x] Tarea 2.2: Implementar reCAPTCHA v2 Checkbox en `RegisterForm`.
- [x] Tarea 2.3: Implementar validación Zod en formularios (título, email, passwords, username).
- [x] Tarea 2.4: Implementar flujo de reset password con código Resend.
- [x] Tarea 2.5: Desarrollar páginas `/login`, `/register`, `/forgot-password`.

## 3. Seguridad e Integración

- [x] Tarea 3.1: Implementar Middleware de protección (redirigir si no hay sesión).
- [x] Tarea 3.2: Ajustar lógica de sincronización (utilizar token de sesión, no clave anónima).
- [x] Tarea 3.3: Configurar persistencia de sesión 7 días (Remember me).
- [x] Tarea 3.4: QA final de flujos de usuario y tests automáticos.

## 4. Verificación por OTP y endurecimiento (2026-11-10)

- [x] Tarea 4.1: Activar plugin `emailOTP` con verificación obligatoria (`requireEmailVerification: true`, `overrideDefaultEmailVerification: true`, `storeOTP: "hashed"`, 6 dígitos, 10 min, 5 intentos).
- [x] Tarea 4.2: Registrar fail-closed: reCAPTCHA dentro de `/api/auth/register` y rollback de la cuenta si Resend falla (502).
- [x] Tarea 4.3: Página `/verify-email` con formulario OTP y reenvío con cooldown de 60 s.
- [x] Tarea 4.4: Mover el CRUD de tareas a rutas server-side autenticadas (`/api/tasks`) con SQL parametrizado.
- [x] Tarea 4.5: Lockdown de Supabase: revocar grants/políticas de `anon`/`authenticated` y retirar `tasks` de Realtime.
- [x] Tarea 4.6: Sustituir Realtime por sondeo + refresh; cola offline vinculada por `ownerId`.
- [x] Tarea 4.7: QA directo (BD) y HTTP (API): aislamiento, inyección, rollback, duplicados y CSRF.

## 5. Registro diferido hasta verificar el correo (2026-11-10)

- [x] Tarea 5.1: Crear `public.pending_registration` (email/username únicos, hash de contraseña y del OTP, expiración, intentos, cooldown) con RLS y sin grants públicos.
- [x] Tarea 5.2: `src/lib/pending-registration.ts`: alta "el último gana", purga de pendientes, limpieza de cuentas sin verificar antiguas, verificación atómica y creación de `user` + `account` solo con OTP correcto.
- [x] Tarea 5.3: Reescribir `/api/auth/register` para no crear la cuenta; añadir `/api/auth/verify-email` y `/api/auth/resend-verification`.
- [x] Tarea 5.4: Retirar el plugin `emailOTP` de Better Auth y del cliente; la verificación ya no depende de un usuario existente.
- [x] Tarea 5.5: Actualizar `/verify-email` (redirige a `/login` tras verificar) y `/login` (aviso de correo verificado; `EMAIL_NOT_VERIFIED` apunta a completar el registro).
- [x] Tarea 5.6: QA: registrar no crea `user`; OTP incorrecto incrementa intentos; OTP correcto crea usuario verificado y el login funciona; corrección de email/username reemplaza el pendiente; conflicto con cuenta verificada devuelve 409; expiración y reenvío con cooldown.

---

## Estado Actual: ✅ COMPLETADO

La autenticación con Better Auth, la verificación por OTP y el aislamiento de tareas están implementados.

> ✅ El dominio `luuiscastro.me` está verificado en Resend y `EMAIL_FROM` usa `no-reply@luuiscastro.me`.

### Archivos creados/modificados:

**Backend / Seguridad:**
- `src/lib/auth.ts` - Configuración de Better Auth y verificación obligatoria; el plugin `emailOTP` fue retirado.
- `src/lib/auth-client.ts` - Cliente de Better Auth con el plugin `username`.
- `src/lib/auth-server.ts` - Helper `getSession()` para Server Components y rutas.
- `src/lib/db.ts` - Pool único de PostgreSQL reutilizado por Better Auth y las rutas.
- `src/lib/pending-registration.ts` - Registros pendientes: alta "el último gana", OTP propio, verificación y creación diferida de `user` + `account`.
- `src/lib/email.ts` - Envío con Resend y plantillas HTML (código de verificación y reset) con escape.
- `src/lib/recaptcha.ts` - Verificación reCAPTCHA server-side fail-closed.
- `src/lib/tasks-repo.ts` - CRUD parametrizado de tareas con `owner_id` derivado de la sesión.
- `src/app/api/auth/[...all]/route.ts` - Handler de endpoints de Better Auth.
- `src/app/api/auth/register/route.ts` - Registro fail-closed con reCAPTCHA; solo crea el pendiente.
- `src/app/api/auth/verify-email/route.ts` - Verifica el OTP y crea la cuenta real.
- `src/app/api/auth/resend-verification/route.ts` - Reenvío del código con cooldown.
- `src/app/api/tasks/route.ts` - API autenticada de tareas (GET/POST/PUT/DELETE).
- `supabase/migrations/20261109010000_better_auth_and_tasks_owner.sql` - Migración de schema.
- `supabase/migrations/20261110000000_lock_down_tasks.sql` - Lockdown de grants/RLS y Realtime.
- `supabase/migrations/20261111000000_pending_registrations.sql` - Tabla `pending_registration` con RLS y sin grants públicos.

**Validación:**
- `src/lib/auth-validation.ts` - Schemas Zod para login, registro, verificación OTP, reenvío y reset.

**UI/Páginas:**
- `src/app/login/page.tsx` - Login con aviso de correo verificado y manejo de `EMAIL_NOT_VERIFIED`.
- `src/app/register/page.tsx` - Registro con reCAPTCHA integrado en el servidor.
- `src/app/verify-email/` - Página y formulario de verificación por OTP; redirige a `/login` al confirmar.
- `src/app/forgot-password/page.tsx` - Recuperación de contraseña.
- `src/app/page.tsx` - Guard server-side de sesión y correo verificado.
- `src/components/user-menu.tsx` - Menú de usuario con logout.
- `src/middleware.ts` - Protección de rutas (públicas y exclusión de `/api`).

**Estado/Sincronización:**
- `src/lib/types.ts` - `ownerId` en el tipo `Task`.
- `src/lib/task-mapper.ts` - Mapeo hacia/desde filas de `tasks`.
- `src/lib/tasks-sync.ts` - Cliente de sincronización contra `/api/tasks`.
- `src/lib/sync-queue.ts` - Cola offline por usuario.
- `src/store/task-store.ts` - `ownerId` persistido y limpieza al cambiar de cuenta.
- `src/hooks/use-tasks-sync.ts` - Sondeo (20 s) y reconciliación sin Realtime.

**Notas:**
- La aplicación requiere `BETTER_AUTH_SECRET`, `DATABASE_URL`/`DIRECT_URL`, `RESEND_API_KEY` y `EMAIL_FROM` con un dominio verificado.
- El build, el typecheck y el lint pasan exitosamente.