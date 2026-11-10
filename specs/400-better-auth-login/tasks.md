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

---

## Estado Actual: ✅ COMPLETADO

La autenticación con Better Auth, la verificación por OTP y el aislamiento de tareas están implementados.

> ⚠️ **Pendiente de infraestructura**: verificar un dominio en Resend y actualizar `EMAIL_FROM`. Sin esto, el registro falla de forma cerrada (502).

### Archivos creados/modificados:

**Backend / Seguridad:**
- `src/lib/auth.ts` - Configuración de Better Auth, plugin `emailOTP` y verificación obligatoria.
- `src/lib/auth-client.ts` - Cliente de Better Auth con plugins `username` y `emailOTP`.
- `src/lib/auth-server.ts` - Helper `getSession()` para Server Components y rutas.
- `src/lib/db.ts` - Pool único de PostgreSQL reutilizado por Better Auth y las rutas.
- `src/lib/email.ts` - Envío con Resend y plantillas HTML (código de verificación y reset) con escape.
- `src/lib/recaptcha.ts` - Verificación reCAPTCHA server-side fail-closed.
- `src/lib/tasks-repo.ts` - CRUD parametrizado de tareas con `owner_id` derivado de la sesión.
- `src/app/api/auth/[...all]/route.ts` - Handler de endpoints de Better Auth.
- `src/app/api/auth/register/route.ts` - Registro fail-closed con reCAPTCHA, OTP y rollback.
- `src/app/api/tasks/route.ts` - API autenticada de tareas (GET/POST/PUT/DELETE).
- `supabase/migrations/20261109010000_better_auth_and_tasks_owner.sql` - Migración de schema.
- `supabase/migrations/20261110000000_lock_down_tasks.sql` - Lockdown de grants/RLS y Realtime.

**Validación:**
- `src/lib/auth-validation.ts` - Schemas Zod para login, registro, verificación OTP y reset.

**UI/Páginas:**
- `src/app/login/page.tsx` - Login con manejo de `EMAIL_NOT_VERIFIED`.
- `src/app/register/page.tsx` - Registro con reCAPTCHA integrado en el servidor.
- `src/app/verify-email/` - Página y formulario de verificación por OTP.
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