# Hometable — Tablero de tareas

Aplicación de gestión de tareas en formato **Kanban**, construida con Next.js 16 (App Router), Tailwind CSS 4, componentes de shadcn/ui y Zustand. Funciona sin backend propio: los datos se guardan en el `localStorage` del navegador y, opcionalmente, se sincronizan entre dispositivos con Supabase.

**Demo pública:** <https://hometable-tasks.vercel.app>

## Características

- Tablero de tres columnas: **Pendiente**, **En progreso** y **Hecha**.
- Arrastrar y soltar entre columnas y reordenar dentro de una columna (ratón, táctil y teclado).
- Crear, editar, duplicar y eliminar tareas, con confirmación y opción de **deshacer**.
- Prioridades (baja, media, alta, urgente), etiquetas, fecha límite y descripción.
- Búsqueda por título, descripción o etiqueta, además de filtros por prioridad, etiqueta y vencimiento.
- Orden manual o automático por prioridad o fecha límite.
- Métricas del tablero: total, pendientes, en progreso, completadas, vencidas y progreso general.
- Modo claro, oscuro o según el sistema.
- **Sincronización automática entre dispositivos** vinculada a tu cuenta de usuario.
- **Persistencia híbrida**: datos guardados en localStorage (como respaldo) y sincronizados con la base de datos.
- Diseño responsive: carrusel con ajuste por columna en móvil.
- Accesibilidad: anuncios del arrastre en español, etiquetas ARIA y alternativa "Mover a" en el menú de cada tarjeta.
- Indicador visual de estado de conexión en tiempo real.

## Stack

| Herramienta | Versión |
| --- | --- |
| Next.js (App Router, Turbopack) | 16.4.3 |
| React | 19.3.0 |
| Tailwind CSS | 4.3.3 |
| shadcn/ui (Radix) | 4.x |
| Zustand + persist | 5.x |
| @dnd-kit | 6.x / 10.x |
| date-fns (locale `es`) | 4.x |
| React Hook Form + Zod | 7.x / 4.x |
| Supabase JS (Postgres + Realtime) | 2.x |

## Empezar

Requiere Node.js 20.9 o superior y pnpm.

```bash
pnpm install
pnpm dev
```

La aplicación estará disponible en <http://localhost:3000>.

### Sincronización opcional con Supabase

Sin configuración adicional la app funciona en **modo local**. Para activar la
sincronización multi-dispositivo:

1. Copia `.env.example` a `.env.local` y rellena las variables públicas:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-publica
   ```

2. Aplica la migración de `supabase/migrations/20261109000000_align_tasks_schema.sql`
   en el SQL Editor de Supabase o con `supabase db push`.
3. Reinicia `pnpm dev`.

La migración crea la tabla `tasks`, el trigger de `updated_at`, los índices, las
políticas RLS, los permisos para `anon`/`authenticated` y añade la tabla a la
publicación `supabase_realtime`. La guía detallada está en [GUIA.md](GUIA.md) y en
`specs/300-sync-realtime/quickstart.md`.

> La `anon key` es pública por diseño. La protección real de los datos depende de
> RLS; nunca subas `.env.local` ni claves secretas al repositorio.

### Scripts

```bash
pnpm dev      # servidor de desarrollo
pnpm build    # compilación de producción
pnpm start    # servidor de producción (requiere pnpm build)
pnpm lint     # ESLint
pnpm exec next typegen && pnpm exec tsc --noEmit   # tipos de rutas y del proyecto
```

## Spec-Driven Development (Spec Kit)

El proyecto usa [GitHub Spec Kit](https://github.com/github/spec-kit) 1.2.6 con la metodología **Spec-Driven Development (SDD)**: antes de escribir código se acuerda qué se quiere, cómo se hará y en qué orden, y el agente implementa solo sobre esos artefactos. Así los cambios son acotados y verificables, y no se improvisa sobre el tablero.

### Instalación y configuración

| Elemento | Ubicación |
| --- | --- |
| Constitución del proyecto (autoridad principal) | `.specify/memory/constitution.md` |
| Plantillas adaptadas a Hometable | `.specify/templates/overrides/` |
| Comandos disponibles en OpenCode | `.opencode/commands/` |
| Extensión `git` (ramas, hooks y commits) | `.specify/extensions/git/` |
| Configuración de la instalación | `.specify/init-options.json`, `.specify/extensions.yml` |
| Guía operativa para agentes | `AGENTS.md` |

El CLI `specify` se instala de forma global con [uv](https://docs.astral.sh/uv/) (`uv tool install specify-cli --from git+https://github.com/github/spec-kit.git`); no es una dependencia del `package.json`.

### Flujo de trabajo

1. `/speckit.specify`: describe la funcionalidad y genera la especificación.
2. `/speckit.clarify` (opcional): resuelve ambigüedades antes de diseñar.
3. `/speckit.plan`: produce el plan técnico y la verificación constitucional.
4. `/speckit.tasks`: divide el trabajo en tareas ordenadas por historia.
5. `/speckit.analyze`: revisa la coherencia entre spec, plan y tareas.
6. `/speckit.implement`: ejecuta las tareas y valida las puertas de calidad.

La extensión `git` crea automáticamente la rama `NNN-nombre` antes de `/speckit.specify`; `master` permanece desplegable en Vercel. También están disponibles `/speckit.checklist`, `/speckit.constitution` y los comandos `/speckit.git.*` (feature, commit, validate, remote, initialize).

### Artefactos por funcionalidad

Cada funcionalidad vive en `specs/NNN-nombre/`:

```text
specs/001-nombre/
├── spec.md          # Qué se quiere y para quién (sin código)
├── plan.md          # Cómo se hará técnicamente
├── research.md      # Decisiones y dudas resueltas
├── data-model.md    # Cambios de modelo, persistencia y migración
├── quickstart.md    # Pasos de prueba manual
├── tasks.md         # Tareas ordenadas por historia
└── contracts/       # Solo si hay formatos externos relevantes
```

### Reglas y puertas de calidad

- La UI y todos los documentos SDD se escriben en español.
- Es una SPA sin backend propio: la persistencia base es `localStorage` (`taskboard:v2`) y la sincronización multi-dispositivo con Supabase es opcional.
- Se reutilizan `src/components/ui/`, `src/lib/task-utils.ts` y `src/store/task-store.ts` antes de crear alternativas.
- Toda entrega debe superar `pnpm lint`, `pnpm exec next typegen` + `pnpm exec tsc --noEmit`, `pnpm build` y el QA manual descrito en el plan.
- Los commits siguen el estilo Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).

> **Mantenimiento:** `specify integration status` reporta dos archivos gestionados modificados a propósito: `.specify/scripts/powershell/common.ps1` (fuerza UTF-8 en Windows para no corromper tildes y eñes) y `.specify/.gitignore` (ignora la caché de extensiones). No ejecutes `specify integration upgrade --force` sin volver a aplicar el fix de UTF-8.

## Despliegue

La aplicación está desplegada en **Vercel** (plan Hobby):

- URL de producción: <https://hometable-tasks.vercel.app>
- Repositorio: `lcastro-2025499/hometable` (público).
- Cada `push` a la rama `master` genera un despliegue automático.
- Para sincronizar, configura `NEXT_PUBLIC_SUPABASE_URL` y
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` en **Settings → Environment Variables** para
  Production, Preview y Development. Sin ellas el despliegue funciona en modo local.
- El proyecto usa Node 22 (`.nvmrc`) y pnpm (campo `packageManager`).

Para desplegar desde cero: importar el repositorio en <https://vercel.com/new>, mantener la configuración detectada (Next.js, `pnpm build`) y desplegar. El nombre del proyecto debe ser `hometable-tasks` para conservar el subdominio.

## Estructura

```
src/
  app/
    layout.tsx          # tema, toasts, tooltips y metadatos
    page.tsx            # monta el tablero
    globals.css         # Tailwind 4 y tokens de shadcn
  components/
    board/              # tablero, columnas, tarjetas, toolbar, métricas
    tasks/              # diálogos de tarea, formulario, etiquetas, fecha
    ui/                 # componentes shadcn + connection-status.tsx
    theme-provider.tsx
    theme-toggle.tsx
  hooks/
    use-hydrated.ts     # evita desajustes de hidratación con localStorage
    use-supabase.ts     # acceso al cliente nullable
    use-tasks-sync.ts   # carga, Realtime, offline/online y migración
  lib/
    constants.ts        # configuración visual, claves y filtros
    seed.ts             # datos de ejemplo
    storage-migration.ts # taskboard:v1 -> taskboard:v2
    supabase.ts         # cliente singleton opcional
    supabase-sync.ts    # writers REST y vaciado de la cola
    sync-queue.ts       # cola offline en localStorage
    task-mapper.ts      # Task <-> fila de Supabase
    task-sync.ts        # reconciliación por updatedAt
    task-utils.ts       # filtros, orden, estadísticas y movimientos
    types.ts
    types/supabase.ts   # tipos generados desde Supabase
    validation.ts       # esquemas Zod
  store/
    task-store.ts       # estado global y sincronización de mutaciones
supabase/
  migrations/           # esquema, RLS, permisos y Realtime versionados
```

## Persistencia

- **Clave de `localStorage`**: `taskboard:v2`. Los datos de `taskboard:v1` se migran
  automáticamente y la clave anterior se conserva como respaldo.
- **Modo local**: funciona sin Supabase y sin conexión.
- **Sincronización opcional**: cada mutación se envía a Supabase; los cambios llegan
  a otros dispositivos por Realtime (WebSocket).
- **Cola offline**: las operaciones fallidas se guardan en `taskboard:sync-queue` y
  se reintentan al reconectar.
- **Conflictos**: gana la tarea con `updatedAt` más reciente.
- Solo se persisten las tareas; filtros y tema se mantienen en memoria o en `next-themes`.
- La carga se hace después de montar el componente, mostrando un esqueleto para evitar desajustes de hidratación.

### Modelo de tarea

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
}
```

## Limitaciones

- La sincronización usa un tablero compartido: cualquier persona con la URL y las
  variables públicas puede leer y escribir. Es un MVP sin cuentas.
- No hay autenticación individual ni permisos por usuario todavía. La columna
  `owner_id` y las políticas por usuario quedan preparadas para una fase futura.
- La primera sincronización necesita conexión; después los cambios funcionan offline
  y se encolan.
- El QA visual en navegador (drag & drop, diálogo de migración, offline/online y dos
  dispositivos) está documentado en `specs/300-sync-realtime/QA.md` y requiere
  validación humana.

## Licencia

Distribuido bajo la licencia **MIT**. Puedes usar, copiar, modificar y redistribuir el código siempre que conserves el aviso de autoría. Consulta [LICENSE](LICENSE) para el texto completo.

Este es un proyecto personal con fines de demostración; no incluye garantías ni soporte.
