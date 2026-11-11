# Hometable — Tablero de tareas

Aplicación web full-stack de gestión de tareas en formato **Kanban**, construida
con Next.js 16 (App Router), Tailwind CSS 4, shadcn/ui, Zustand y PostgreSQL
(Supabase). La autenticación es obligatoria y el servidor es la única fuente de
verdad: los datos viven en Postgres y se sincronizan entre los dispositivos de
la misma cuenta.

**Demo pública:** <https://hometable.luuiscastro.me>

## Características

- Tablero de tres columnas: **Pendiente**, **En progreso** y **Hecha**.
- Arrastrar y soltar entre columnas y reordenar dentro de una columna (ratón,
  táctil y teclado).
- Crear, editar, duplicar y eliminar tareas, con confirmación y opción de
  **deshacer**.
- Prioridades (baja, media, alta, urgente), etiquetas, fecha límite y
  descripción.
- Búsqueda por título, descripción o etiqueta; filtros por prioridad, etiqueta y
  vencimiento; orden manual o automático.
- Métricas del tablero: total, pendientes, en progreso, completadas, vencidas y
  progreso general.
- Modo claro, oscuro o según el sistema.
- Registro con verificación por código OTP, inicio de sesión, recuperación de
  contraseña y sesión persistente.
- **Realtime autenticado**: los cambios de la propia cuenta llegan al resto de
  dispositivos por WebSocket. Si Realtime no está disponible, un sondeo cada
  30 s mantiene el tablero al día.
- Diseño responsive, anuncios de arrastre en español, etiquetas ARIA y
  alternativa «Mover a» en el menú de cada tarjeta.

## Stack

| Herramienta | Versión |
| --- | --- |
| Next.js (App Router, Turbopack) | 16.4.3 |
| React | 19.3.0 |
| Tailwind CSS | 4.x |
| shadcn/ui (Radix) | 4.x |
| Zustand (sin persistencia de tareas) | 5.x |
| @dnd-kit | 6.x / 10.x |
| date-fns (locale `es`) | 4.x |
| React Hook Form + Zod | 7.x / 4.x |
| Better Auth + `pg` | 1.x / 8.x |
| Supabase JS (solo Realtime) | 2.x |
| Resend (correo transaccional) | 6.x |

## Empezar

Requiere **Node.js 22** (ver `.nvmrc`) y pnpm.

```bash
pnpm install
cp .env.example .env.local   # rellena las variables (ver tabla)
pnpm dev
```

La aplicación estará en <http://localhost:3000>. Sin las variables de correo y
base de datos no es posible registrar cuentas ni cargar el tablero: no hay modo
invitado ni almacenamiento local de tareas.

### Variables de entorno

Cada variable está documentada con más detalle en [`.env.example`](.env.example).

| Variable | Ámbito | Obligatoria | Para qué |
| --- | --- | --- | --- |
| `DATABASE_URL` | Secreta · servidor | Sí | Pooler de Supabase (puerto 6543) usado por Better Auth y `/api/tasks`. |
| `DIRECT_URL` | Secreta · servidor | No | Conexión directa de respaldo (puerto 5432) para migraciones. |
| `BETTER_AUTH_SECRET` | Secreta · servidor | Sí | Firma de sesiones y de la cookie del registro pendiente (32+ caracteres). |
| `BETTER_AUTH_URL` | Servidor | Sí | Origen canónico para cookies, enlaces de correo y orígenes de confianza. HTTPS en producción. |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Servidor | No | Orígenes extra aceptados (separados por comas), por ejemplo el dominio `vercel.app`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Pública · cliente | Para Realtime | URL del proyecto Supabase. Sin ella se usa solo sondeo. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública · cliente | Para Realtime | Clave `anon`; RLS limita el acceso a las tareas propias. |
| `SUPABASE_JWT_SECRET` | Secreta · servidor | Para Realtime | Firma los JWT HS256 de 15 min que autentican el canal. |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Pública · cliente | Sí | Widget de reCAPTCHA en el registro. |
| `RECAPTCHA_SECRET_KEY` | Secreta · servidor | Sí | Verificación del token dentro de `/api/auth/register`. |
| `RESEND_API_KEY` | Secreta · servidor | Sí | Envío del OTP y de los códigos de recuperación. |
| `EMAIL_FROM` | Servidor | Sí | Remitente de un dominio verificado en Resend. No hay fallback. |

En Vercel configura cada variable **por entorno**. Production es obligatorio; un
valor de Production no se hereda en Preview ni en Development.

### Base de datos

Aplica las migraciones de `supabase/migrations/` en orden con la CLI de Supabase
o desde el SQL Editor:

| Migración | Contenido |
| --- | --- |
| `20261109000000_align_tasks_schema.sql` | Tabla `tasks`, trigger de `updated_at` e índices base. |
| `20261109010000_better_auth_and_tasks_owner.sql` | Tablas de Better Auth y columna `owner_id`. |
| `20261110000000_lock_down_tasks.sql` | RLS y revocación de grants de `anon`/`authenticated`. |
| `20261111000000_pending_registrations.sql` | Registros pendientes de verificación. |
| `20261112000000_realtime_owner_read.sql` | Lectura Realtime solo de las tareas propias. |
| `20261112010000_auth_rate_limit.sql` | Contadores de rate limit de autenticación. |
| `20261112020000_tasks_owner_indexes.sql` | Índices `(owner_id, status, order)` y `(owner_id, created_at)`. |

## Arquitectura

### Flujo de datos

```text
Navegador ──POST/DELETE──▶ /api/tasks ──SQL parametrizado──▶ PostgreSQL
    ▲                         │
    │                         └─ valida sesión Better Auth y fuerza owner_id
    │
    └──WebSocket──▶ Supabase Realtime ◀── cambios de la tabla tasks
                        (JWT de 15 min + RLS por sub)
```

- **El servidor es la única fuente de verdad.** El navegador no escribe
  directamente en Postgres ni guarda tareas en `localStorage`.
- Las mutaciones son **optimistas**: el store actualiza la UI al instante y
  envía el cambio a `/api/tasks`. Si la escritura falla, se avisa y se recarga
  el tablero desde el servidor.
- Las lecturas se hacen por `GET /api/tasks` al cargar, al recuperar el foco, al
  volver la conexión y cada 30 s como respaldo.
- Realtime emite INSERT/UPDATE/DELETE de la propia cuenta. El cliente pide un
  JWT corto a `/api/realtime/token`, lo instala en el canal y vuelve a
  sincronizar al suscribirse.
- El tema claro/oscuro es la única preferencia que vive en `localStorage`
  (gestionada por `next-themes`).

### Seguridad

- **Autenticación obligatoria** con Better Auth y verificación de correo previa
  al primer inicio de sesión.
- **Registro diferido**: la cuenta real solo se crea cuando el OTP de 6 dígitos
  es correcto. Mientras tanto se guarda un registro pendiente con la contraseña
  y el OTP ya hasheados.
- El OTP está vinculado al navegador mediante una cookie `httpOnly` firmada con
  HMAC; caduca a los 10 minutos y admite 5 intentos.
- **Rate limit en Postgres** para registro, verificación y reenvío. Las
  respuestas de registro y reenvío son genéricas para no enumerar correos.
- Las rutas de escritura exigen mismo origen y derivan `owner_id` de la sesión
  (nunca del cuerpo de la petición).
- `tasks` tiene RLS activo y concede a `authenticated` únicamente `SELECT` de las
  filas cuyo `owner_id` coincide con el claim `sub` del JWT.
- Cabeceras de seguridad: CSP con allowlist de reCAPTCHA y Supabase,
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS en producción y `poweredByHeader: false`.
- Ningún secreto se expone al cliente: solo las variables `NEXT_PUBLIC_*`
  llegan al navegador. `.env.local` está fuera de git.

## Scripts y puertas de calidad

```bash
pnpm dev      # servidor de desarrollo
pnpm build    # compilación de producción
pnpm start    # servidor de producción (requiere pnpm build)
pnpm lint     # ESLint

pnpm exec next typegen
pnpm exec tsc --noEmit
```

Antes de integrar, ejecuta `pnpm lint`, `pnpm exec next typegen` +
`pnpm exec tsc --noEmit`, `pnpm build` y el QA manual descrito en el plan de la
funcionalidad.

## Spec-Driven Development (Spec Kit)

El proyecto usa [GitHub Spec Kit](https://github.com/github/spec-kit) 1.2.6 con
la metodología **Spec-Driven Development (SDD)**: antes de escribir código se
acuerda qué se quiere, cómo se hará y en qué orden, y el agente implementa solo
sobre esos artefactos.

| Elemento | Ubicación |
| --- | --- |
| Constitución del proyecto (autoridad principal) | `.specify/memory/constitution.md` |
| Plantillas adaptadas a Hometable | `.specify/templates/overrides/` |
| Comandos disponibles en OpenCode | `.opencode/commands/` |
| Extensión `git` (ramas, hooks y commits) | `.specify/extensions/git/` |
| Guía operativa para agentes | `AGENTS.md` |

Flujo: `/speckit.specify` → `/speckit.clarify` (opcional) → `/speckit.plan` →
`/speckit.tasks` → `/speckit.analyze` → `/speckit.implement`.

Reglas:

- La UI y los documentos SDD se escriben en español.
- Es una aplicación full-stack con Next.js App Router, Better Auth y Supabase;
  no existe modo local ni cola offline.
- Se reutilizan `src/components/ui/`, `src/lib/task-utils.ts` y
  `src/store/task-store.ts` antes de crear alternativas.
- Los commits siguen Conventional Commits en inglés y son pequeños y atómicos.

> **Mantenimiento:** `specify integration status` reporta dos archivos
> gestionados modificados a propósito: `.specify/scripts/powershell/common.ps1`
> (fuerza UTF-8 en Windows) y `.specify/.gitignore`. No ejecutes
> `specify integration upgrade --force` sin volver a aplicar el fix de UTF-8.

## Despliegue

La aplicación está desplegada en **Vercel** (plan Hobby):

- URL de producción: <https://hometable.luuiscastro.me>
- Alias de Vercel (también válido): <https://hometable-tasks.vercel.app>
- Repositorio: `lcastro-2025499/hometable`.
- Cada `push` a `master` genera un despliegue automático.
- Configura todas las variables de la tabla anterior en **Settings → Environment
  Variables**, por entorno (Production es obligatorio). `SUPABASE_JWT_SECRET`
  es imprescindible para Realtime y `BETTER_AUTH_TRUSTED_ORIGINS` permite que el
  dominio de Vercel siga autenticando.
- El proyecto usa Node 22 (`.nvmrc`) y pnpm (campo `packageManager`).

Para desplegar desde cero: importa el repositorio en <https://vercel.com/new>,
mantén la configuración detectada (Next.js, `pnpm build`) y despliega. El nombre
del proyecto debe ser `hometable-tasks` para conservar el subdominio.

## Estructura

```text
src/
  app/
    layout.tsx                 # tema, toasts, tooltips y metadatos
    page.tsx                   # exige sesión y monta el tablero
    api/
      auth/register/           # registro pendiente + reCAPTCHA + rate limit
      auth/verify-email/       # valida OTP y crea la cuenta
      auth/resend-verification/
      auth/[...all]/           # endpoints de Better Auth
      realtime/token/          # JWT HS256 de 15 min para Realtime
      tasks/                   # GET/POST/DELETE con sesión y owner_id
    login/ register/ verify-email/ forgot-password/
  components/
    board/                     # tablero, columnas, tarjetas, toolbar, métricas
    tasks/                     # diálogos, formulario, etiquetas, fecha
    ui/                        # componentes shadcn + connection-status
  hooks/
    use-hydrated.ts            # evita desajustes con preferencias de UI
    use-tasks-sync.ts          # carga, sondeo, foco/online y recuperación
    use-tasks-realtime.ts      # canal autenticado y mapeo de eventos
  lib/
    auth.ts / auth-client.ts   # configuración de Better Auth
    auth-server.ts             # lectura de sesión en el servidor
    db.ts                      # pool único de PostgreSQL
    http.ts                    # mismo origen, JSON, IP y HTTPS
    rate-limit.ts              # contadores en public.auth_rate_limit
    pending-cookie.ts          # cookie firmada del registro pendiente
    pending-registration.ts    # OTP, conflictos y creación de la cuenta
    realtime-token.ts          # firma del JWT de Realtime
    tasks-repo.ts              # SQL parametrizado de tareas
    tasks-sync.ts              # cliente de /api/tasks
    task-mapper.ts             # fila de Postgres -> Task
    task-utils.ts              # filtros, orden, estadísticas y movimientos
    validation.ts              # esquemas Zod del formulario de tarea
  store/
    task-store.ts              # estado global de tareas (sin persistencia)
supabase/
  migrations/                  # esquema, RLS, índices, rate limit y Realtime
```

## Modelo de tarea

```ts
interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: string; // yyyy-MM-dd
  tags: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  ownerId?: string; // lo fuerza el servidor desde la sesión
}
```

## Alcance y limitaciones

- Realtime está limitado a **la misma cuenta en varios dispositivos**. La
  colaboración entre usuarios distintos (tableros compartidos, invitaciones o
  chat) no forma parte de esta versión.
- No hay soporte offline ni cola de reintentos: si el servidor no responde, la
  UI avisa y recupera el estado autoritativo al reconectar.
- No se importan ni exportan tableros y no se cargan datos de ejemplo.
- Solo se persiste el tema en el navegador; las tareas siempre viven en
  PostgreSQL.

## Licencia

Distribuido bajo la licencia **MIT**. Puedes usar, copiar, modificar y
redistribuir el código siempre que conserves el aviso de autoría. Consulta
[LICENSE](LICENSE) para el texto completo.
