# Progreso del Proyecto: Hometable

**Estado actual**: Autenticación con Better Auth completada y en proceso de QA.

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

## Commits recientes

- `4390c4b` - feat(auth): implement authentication flow with Better Auth, reCAPTCHA, and password recovery
- `abcffe8` - build(deps): add react-google-recaptcha
- `4e58f44` - build(deps): add better-auth, resend, and pg

## Notas

La aplicación requiere las siguientes variables de entorno para probar flujos reales:
- `BETTER_AUTH_SECRET` - Secret key para Better Auth
- `RESEND_API_KEY` - API key de Resend (gratuita)
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` - Site key de Google reCAPTCHA
- `RECAPTCHA_SECRET_KEY` - Secret key de Google reCAPTCHA