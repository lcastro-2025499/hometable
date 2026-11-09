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
- [ ] Tarea 3.4: QA final de flujos de usuario y tests automáticos.

---

## Estado Actual

La implementación está **90% completa**. Falta QA final y tests automáticos (Tarea 3.4).

### Archivos creados/modificados:

**Backend:**
- `src/lib/auth.ts` - Configuración de Better Auth
- `src/lib/auth-client.ts` - Cliente de Better Auth con plugin username
- `src/app/api/auth/[...all]/route.ts` - Handler de endpoints de Better Auth
- `src/app/api/auth/register/route.ts` - Registro con campos firstName, lastName, username
- `src/app/api/auth/verify-recaptcha/route.ts` - Verificación de reCAPTCHA
- `supabase/migrations/20261109010000_better_auth_and_tasks_owner.sql` - Migración de schema

**Validación:**
- `src/lib/auth-validation.ts` - Schemas Zod para validación de formularios

**UI/Páginas:**
- `src/app/login/page.tsx` - Página de login
- `src/app/register/page.tsx` - Página de registro con reCAPTCHA
- `src/app/forgot-password/page.tsx` - Página de recuperación de contraseña
- `src/components/user-menu.tsx` - Menú de usuario con logout
- `src/middleware.ts` - Middleware de protección de rutas

**Estado/Sincronización:**
- `src/lib/types.ts` - Agregado ownerId al tipo Task
- `src/lib/task-mapper.ts` - Actualizado para incluir owner_id
- `src/lib/supabase-sync.ts` - Actualizado para usar userId
- `src/store/task-store.ts` - Agregado userId y setUserId
- `src/hooks/use-tasks-sync.ts` - Actualizado para obtener sesión del usuario

**Notas:**
- La aplicación requiere las variables de entorno `BETTER_AUTH_SECRET` y `RESEND_API_KEY` para probar flujos reales
- El build y typecheck pasan exitosamente