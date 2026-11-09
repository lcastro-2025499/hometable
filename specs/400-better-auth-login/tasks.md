# Tareas: Autenticación obligatoria con Better Auth

**Código**: `400-better-auth-login` | **Fecha**: 2026-11-09

---

## 1. Backend y Base de Datos

- [ ] Tarea 1.1: Instalar `better-auth` y adaptador PostgreSQL para Supabase.
- [ ] Tarea 1.2: Crear handler en `src/app/api/auth/[...all]/route.ts`.
- [ ] Tarea 1.3: Ejecutar migraciones de Better Auth en Supabase.
- [ ] Tarea 1.4: Actualizar RLS de tabla `tasks` (vincular `owner_id` obligatorio).
- [ ] Tarea 1.5: Configurar variables de entorno (secrets y site keys).

## 2. Autenticación y UI

- [ ] Tarea 2.1: Crear componentes de formulario `AuthForm` (login, registro).
- [ ] Tarea 2.2: Implementar reCAPTCHA v2 Checkbox en `RegisterForm`.
- [ ] Tarea 2.3: Implementar validación Zod en formularios (título, email, passwords, username).
- [ ] Tarea 2.4: Implementar flujo de reset password con código Resend.
- [ ] Tarea 2.5: Desarrollar páginas `/login`, `/register`, `/forgot-password`.

## 3. Seguridad e Integración

- [ ] Tarea 3.1: Implementar Middleware de protección (redirigir si no hay sesión).
- [ ] Tarea 3.2: Ajustar lógica de sincronización (utilizar token de sesión, no clave anónima).
- [ ] Tarea 3.3: Configurar persistencia de sesión 7 días (Remember me).
- [ ] Tarea 3.4: QA final de flujos de usuario y tests automáticos.
