# Progreso del Proyecto: Hometable

**Estado actual**: ✅ AUTENTICACIÓN COMPLETA - LISTO PARA PRUEBAS

---

## Etapas de Trabajo

### Etapa 1: Core de Tareas y Sincronización Supabase (Completado)
- [x] Estructura base Next.js 16 con Tailwind CSS v4 y shadcn/ui.
- [x] Store con Zustand y persistencia local (`taskboard:v2`).
- [x] Migración SQL y Sincronización Realtime con Supabase.
- [x] Puertas de calidad y despliegue exitoso en Vercel.

### Etapa 2: Autenticación Obligatoria con Better Auth (`400-better-auth-login`) (Completado)
- [x] Configuración del servidor Better Auth y adaptador PostgreSQL.
- [x] Vistas de Login, Registro con reCAPTCHA y Recuperación de Contraseña con Resend.
- [x] Middleware de protección de rutas y asociación de tareas por usuario (`owner_id`).
- [x] **Verificación de correo obligatoria por código OTP de 6 dígitos** (plugin `emailOTP`, `requireEmailVerification: true`, `storeOTP: "hashed"`, 10 min, 5 intentos).
- [x] **Registro fail-closed**: el reCAPTCHA se valida dentro de `/api/auth/register` y, si Resend no puede entregar el código, la cuenta se revierte (HTTP 502).
- [x] **Lockdown de Supabase**: se revocaron grants y políticas de `anon`/`authenticated` sobre `tasks`, `board` y tablas de Better Auth; se retiró `tasks` de Realtime.
- [x] **CRUD de tareas server-side** con SQL parametrizado (`src/lib/tasks-repo.ts`) y sesión verificada (`/api/tasks`); el cliente ya no usa la anon key.
- [x] Sincronización por sondeo (20 s) + refresh en focus/online, cola offline vinculada por `ownerId`.
- [x] QA directo (BD) y HTTP (rutas API): aislamiento entre usuarios, inyección de IDs, rollback, duplicados y origen CSRF.

> ⚠️ **Bloqueo conocido (producción)**: el dominio de Resend (`hometable.resend`) está en estado `not_started`. Hasta verificar un dominio real y ajustar `EMAIL_FROM`, ningún registro nuevo podrá completar el envío del código OTP y devolverá 502. Ver `.env.example`.

### Etapa 3: Futuro (Planificado)
- [ ] Interfaz estilo Anthropic para landing.
- [ ] Cambio de nombre de usuario dentro del tablero.
- [ ] Invitaciones y chat entre usuarios.
- [ ] Límite de 2 tableros por usuario.

---

## Commits Completados

1. `4390c4b` - feat(auth): implement authentication flow with Better Auth, reCAPTCHA, and password recovery
2. `abcffe8` - build(deps): add react-google-recaptcha
3. `4e58f44` - build(deps): add better-auth, resend, and pg
4. `402e979` - docs: add .env.example with all required environment variables for auth
5. `d235edc` - fix(auth): resolve registration and validation issues

## Variables de Entorno Requeridas

Para probar flujos reales, asegúrate de tener en `.env.local`:
- `BETTER_AUTH_SECRET` - Clave secreta (32+ caracteres, generada con PowerShell)
- `DATABASE_URL` o `DIRECT_URL` - Conexión PostgreSQL Supabase
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` + `RECAPTCHA_SECRET_KEY` - Google reCAPTCHA
- `RESEND_API_KEY` - Para password reset
- `EMAIL_FROM` - Email desde el cual se envían los correos

## Pruebas a Realizar

1. Registrar un nuevo usuario en `/register` (requiere reCAPTCHA y un dominio verificado en Resend).
2. Verificar el correo con el código OTP de 6 dígitos en `/verify-email`.
3. Iniciar sesión en `/login` (bloqueado hasta verificar el correo).
4. Verificar que el dashboard (`/`) requiere autenticación.
5. Probar recuperación de contraseña en `/forgot-password`.
6. Verificar que las tareas se asocian al `owner_id` del usuario y que otro usuario no puede verlas ni modificarlas.
7. Verificar que la anon key de Supabase ya no puede leer la tabla `tasks` (401 permission denied).