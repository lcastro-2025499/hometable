# Plan de implementación: Sincronización en tiempo real y multi-dispositivo

**Rama**: `master` (trabajo directo, sin rama de feature) | **Fecha**: 2026-11-09 | **Especificación**: [spec.md](./spec.md)

**Entrada**: Especificación de `specs/300-sync-realtime/spec.md`

## Resumen

Se añade a Hometable una capa opcional de sincronización con Supabase sin romper el
modo local. `localStorage` (`taskboard:v2`) sigue siendo la fuente de respaldo; cada
mutación del store se envía a Postgres por REST y los demás clientes reciben los
cambios por Supabase Realtime. Si no hay variables de entorno o conexión, la app
funciona como antes y encola las operaciones pendientes.

Los cambios principales están en `src/store/task-store.ts`, `src/hooks/use-tasks-sync.ts`,
`src/lib/supabase-sync.ts`, `src/lib/sync-queue.ts`, `src/lib/task-sync.ts`,
`src/lib/task-mapper.ts`, `src/lib/storage-migration.ts` y
`src/components/ui/connection-status.tsx`. Se verifican con las puertas del proyecto
y una prueba real de REST + Realtime.

## Contexto técnico

- **Lenguaje/Versión**: TypeScript 5 en modo `strict`; Node.js 22 y pnpm 12.
- **Framework**: Next.js 16 (App Router, Turbopack) con React 19.
- **Dependencias principales**: Zustand 5 (`persist`), Zod 4, React Hook Form,
  `@dnd-kit/core` + `@dnd-kit/sortable`, date-fns 4 (locale `es`), sonner,
  next-themes, lucide-react, Radix UI, shadcn/ui y `@supabase/supabase-js` 2.x.
- **Estilos**: Tailwind CSS 4 y tokens de `src/app/globals.css`.
- **Almacenamiento**: `localStorage` con clave `taskboard:v2`; respaldo de
  `taskboard:v1` durante la migración; cola en `taskboard:sync-queue`.
- **Servicio externo**: Supabase (Postgres + PostgREST + Realtime) en capa gratuita.
- **Pruebas**: no hay framework automatizado. Puertas oficiales: `pnpm lint`,
  `pnpm exec next typegen` + `pnpm exec tsc --noEmit`, `pnpm build` y QA manual.
- **Plataforma objetivo**: navegadores modernos en escritorio, tableta y móvil;
  despliegue en Vercel.
- **Objetivos de rendimiento**: interacción inmediata con cientos de tareas; se
  envían solo las tareas que cambiaron.
- **Restricciones**: accesibilidad con teclado y ARIA, interfaz en español,
  responsive, temas claro/oscuro/sistema, `master` siempre desplegable.

## Verificación constitucional

- **I. Dominio tipado**: `Task` no cambia; se añaden tipos generados (`TaskRow`,
  `TaskInsert`) y el mapeo `taskToRow`/`rowToTask`. Zod sigue validando formularios e
  importaciones.
- **II. Persistencia**: se versiona la clave a `taskboard:v2` con migración automática
  desde `taskboard:v1` y se conserva el respaldo. La app sigue funcionando offline.
- **III. Accesibilidad/UI**: el badge tiene `aria-live` y el diálogo usa componentes
  accesibles de `src/components/ui/`. No se altera el drag & drop ni la alternativa
  "Mover a".
- **IV. Componentes/fronteras**: se reutilizan `src/components/ui/`, `task-utils` y el
  store. Los efectos de Realtime viven en un hook cliente; el cliente Supabase es
  singleton y nullable.
- **V. Verificación**: el plan incluye las tres puertas y el QA manual documentado en
  `QA.md`.
- **VI. Alcance**: no hay backend propio; se permite un servicio externo gratuito
  (Supabase) según la constitución v2.1.0.

Sin violaciones: el plan cumple la constitución v2.1.0.

## Estructura del proyecto

### Documentación de la funcionalidad

```text
specs/300-sync-realtime/
├── spec.md              # Especificación
├── plan.md              # Este archivo
├── research.md          # Decisiones e investigación
├── data-model.md        # Modelo de datos y migración
├── quickstart.md        # Configuración y pruebas manuales
├── QA.md                # Resultados del QA
└── tasks.md             # Tareas y estado
```

### Código fuente

```text
src/
├── app/
│   ├── layout.tsx           # metadatos y tema
│   └── page.tsx             # monta el tablero
├── components/
│   ├── board/               # tablero, columnas, tarjetas, toolbar, métricas
│   ├── tasks/               # diálogos, formulario, etiquetas y fecha límite
│   └── ui/                  # shadcn/ui + connection-status.tsx
├── hooks/
│   ├── use-hydrated.ts
│   ├── use-supabase.ts
│   └── use-tasks-sync.ts
├── lib/
│   ├── constants.ts         # taskboard:v2 y taskboard:v1
│   ├── storage-migration.ts
│   ├── supabase.ts
│   ├── supabase-sync.ts
│   ├── sync-queue.ts
│   ├── task-mapper.ts
│   ├── task-sync.ts
│   ├── task-utils.ts
│   ├── types.ts
│   ├── types/supabase.ts
│   └── validation.ts
└── store/
    └── task-store.ts
supabase/migrations/20261109000000_align_tasks_schema.sql
```

## Fases de implementación

### Fase 0: Investigación (`research.md`)

- [x] Elegir Supabase por Realtime gratuito y compatibilidad con Vercel.
- [x] Confirmar UUID en cliente y resolución de conflictos por `updatedAt`.
- [x] Descartar WebSocket autohospedado en Vercel.
- [x] Documentar límites del plan gratuito.

### Fase 1: Diseño (`data-model.md`, `quickstart.md`)

- [x] Definir tabla, mapeo, índices, trigger, RLS y publicación Realtime.
- [x] Definir flujo de escritura optimista, cola offline y reconciliación.
- [x] Documentar migración `taskboard:v1` → `taskboard:v2`.
- [x] Documentar configuración local y en Vercel.

### Fase 2: Implementación (`tasks.md`)

- [x] Cliente Supabase nullable y hook de acceso.
- [x] Tipos generados y mapeo `Task` ↔ fila.
- [x] Writers REST, cola offline y reconciliación.
- [x] Store con sincronización de todas las mutaciones.
- [x] Hook de carga inicial, Realtime, online/offline y migración.
- [x] Badge de estado y diálogo de tareas locales.
- [x] Migración SQL versionada y aplicada.

### Fase 3: Verificación

- [x] `pnpm lint`.
- [x] `pnpm exec next typegen`.
- [x] `pnpm exec tsc --noEmit`.
- [x] `pnpm build`.
- [x] Prueba REST real: INSERT 201, UPDATE 200, SELECT 200, DELETE 200.
- [x] Prueba Realtime real: INSERT, UPDATE y DELETE recibidos.
- [ ] QA visual manual en navegador (drag & drop, diálogo, offline/online y dos
  dispositivos). Requiere intervención humana; ver `QA.md`.

## Comandos de verificación

| Comando | Cuándo | Resultado esperado |
| --- | --- | --- |
| `pnpm lint` | Después de cada bloque de cambios | Sin errores ni warnings nuevos |
| `pnpm exec next typegen` | Antes de comprobar tipos | Tipos de rutas generados |
| `pnpm exec tsc --noEmit` | Después de tocar tipos, props o validación | Sin errores de tipos |
| `pnpm build` | Antes de cerrar la funcionalidad | Build de producción correcto |
| `pnpm dev` | Durante el QA manual | Tablero funcional en `localhost:3000` |

## Riesgos y mitigaciones

- **Carrera al conectar Realtime**: el stream de replicación tarda un instante en
  arrancar tras el join. La app no depende de un evento inmediato: hace una carga
  inicial por REST y luego escucha cambios.
- **Pérdida de datos offline**: cola persistente en `localStorage`, vaciado antes de
  reconciliar y reintento al volver `online`.
- **Conflictos entre dispositivos**: resolución determinista por `updatedAt`.
- **Permisos de API**: RLS por sí solo no basta; la migración incluye `GRANT` a
  `anon` y `authenticated`.
- **Migración desde v1**: se copia sin borrar `taskboard:v1`; si falla el
  almacenamiento, la app arranca vacía sin romperse.
- **Build de Vercel roto**: `pnpm build` local antes de integrar a `master`.
- **Clave pública expuesta**: es esperado en Supabase; la protección real es RLS. No
  se usan claves secretas en el cliente.

## Complejidad justificada

La dependencia `@supabase/supabase-js` y el servicio externo son necesarios para
Realtime sin autohospedar WebSockets. Es una excepción permitida por la constitución
v2.1.0 y no elimina el modo local.

## Seguimiento

- [x] Especificación clarificada y sin `[NEEDS CLARIFICATION]` pendientes.
- [x] Verificación constitucional aprobada.
- [x] `tasks.md` actualizado con el estado real.
- [x] `pnpm lint`, `pnpm exec next typegen` + `pnpm exec tsc --noEmit` y
  `pnpm build` en verde.
- [x] Sincronización REST y Realtime validada contra el proyecto real.
- [ ] QA visual manual completado y documentado.
- [x] Despliegue de `master` en Vercel verificado (`READY`, URL `200`, variables
  públicas presentes en el bundle).
