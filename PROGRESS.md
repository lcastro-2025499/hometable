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
- [x] QA completo y validación con Playwright.

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

1. Registrar un nuevo usuario en `/register`
2. Iniciar sesión en `/login`
3. Verificar que el dashboard (`/`) requiere autenticación
4. Probar recuperación de contraseña en `/forgot-password`
5. Verificar que las tareas se asocian al `owner_id` del usuario