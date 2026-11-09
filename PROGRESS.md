# Progreso del Proyecto: Hometable

**Estado actual**: En preparación para implementar autenticación con Better Auth (`400-better-auth-login`).

---

## Etapas de Trabajo

### Etapa 1: Core de Tareas y Sincronización Supabase (Completado)
- [x] Estructura base Next.js 16 con Tailwind CSS v4 y shadcn/ui.
- [x] Store con Zustand y persistencia local (`taskboard:v2`).
- [x] Migración SQL y Sincronización Realtime con Supabase.
- [x] Puertas de calidad y despliegue exitoso en Vercel.

### Etapa 2: Autenticación Obligatoria con Better Auth (`400-better-auth-login`) (En curso)
- [ ] Configuración del servidor Better Auth y adaptador PostgreSQL.
- [ ] Vistas de Login, Registro con reCAPTCHA y Recuperación de Contraseña con Resend.
- [ ] Middleware de protección de rutas y asociación de tareas por usuario (`owner_id`).
- [ ] QA completo y validación con Playwright.

### Etapa 3: Futuro (Planificado)
- [ ] Interfaz estilo Anthropic para landing.
- [ ] Cambio de nombre de usuario dentro del tablero.
- [ ] Invitaciones y chat entre usuarios.
- [ ] Límite de 2 tableros por usuario.
