# Plan de implementación: Sincronización en tiempo real y multi-dispositivo

**Rama**: `master` (trabajo directo, sin rama de feature) | **Fecha**: 2026-11-09
| **Actualizado**: 2026-11-11 | **Especificación**: [spec.md](./spec.md)

**Entrada**: Especificación de `specs/300-sync-realtime/spec.md`

## Resumen

Hometable sincroniza el tablero de una misma cuenta entre dispositivos. La API
`/api/tasks` valida la sesión de Better Auth y concentra todo el CRUD en SQL
parametrizado; PostgreSQL es la única fuente de verdad. Los demás dispositivos
reciben los cambios por Supabase Realtime con un JWT corto y RLS, y un sondeo cada
30 segundos actúa como respaldo.

El trabajo se apoya en `src/app/api/tasks/route.ts`, `src/lib/tasks-repo.ts`,
`src/lib/tasks-sync.ts`, `src/hooks/use-tasks-sync.ts`,
`src/hooks/use-tasks-realtime.ts`, `src/lib/realtime-token.ts`,
`src/lib/supabase-client.ts`, `src/lib/task-mapper.ts`, `src/store/task-store.ts`
y las migraciones de `supabase/migrations/`.

## Contexto técnico

- **Lenguaje/Versión**: TypeScript 5 en modo `strict`; Node.js 22 y pnpm 12.
- **Framework**: Next.js 16 (App Router, Turbopack) con React 19.
- **Dependencias principales**: Zustand 5 (sin `persist`), Zod 4, React Hook Form,
  `@dnd-kit/core` + `@dnd-kit/sortable`, date-fns 4, sonner, next-themes,
  lucide-react, Radix UI, shadcn/ui, `@supabase/supabase-js` 2.x, Better Auth 1.x,
  `pg` 8.x y Vitest 3.
- **Estilos**: Tailwind CSS 4 y tokens de `src/app/globals.css`.
- **Almacenamiento**: PostgreSQL en Supabase. Solo el tema vive en `localStorage`.
- **Autenticación**: Better Auth con registro diferido y correo verificado.
- **Pruebas**: Vitest para funciones puras; QA manual para UI y dos dispositivos.
- **Plataforma objetivo**: navegadores modernos en escritorio, tableta y móvil;
  despliegue en Vercel.
- **Objetivos de rendimiento**: interacción inmediata con cientos de tareas; se
  envían solo las tareas que cambiaron, con un máximo de 500 por petición.
- **Restricciones**: accesibilidad con teclado y ARIA, interfaz en español,
  responsive, temas claro/oscuro/sistema, `master` siempre desplegable.

## Verificación constitucional

- **I. Dominio tipado**: `Task` se deriva de las constantes; Zod valida formularios,
  payloads del servidor y filas antes de mapearlas. `pnpm test` cubre
  `task-utils`, `validation`, `auth-validation`, `task-mapper`, `http` y
  `realtime-token`.
- **II. Fuente de verdad**: el store no usa `persist`; la carga inicial y cada
  recuperación vienen de `/api/tasks`. No hay cola offline ni reconciliación.
- **III. Accesibilidad/UI**: el badge tiene `aria-live`; el drag & drop y la
  alternativa «Mover a» se mantienen.
- **IV. Componentes/fronteras**: se reutilizan `src/components/ui/`,
  `task-utils` y el store. El SQL vive en `tasks-repo.ts`; los efectos de Realtime
  viven en hooks cliente.
- **V. Seguridad**: sesión, correo verificado, mismo origen, SQL parametrizado,
  CSP con nonce, RLS de solo lectura y rate limit persistente.
- **VI. Realtime**: JWT de 15 minutos, policy por `sub`, `REPLICA IDENTITY FULL` y
  sondeo de respaldo.
- **VII. Verificación**: lint, typegen, tsc, test, build y QA manual documentado en
  `QA.md`; CI ejecuta las cinco puertas automatizadas.

Sin violaciones: el plan cumple la constitución v3.0.0.

## Estructura del proyecto

### Documentación de la funcionalidad

```text
specs/300-sync-realtime/
├── spec.md              # Especificación
├── plan.md              # Este archivo
├── research.md          # Decisiones e investigación
├── data-model.md        # Modelo de datos y migraciones
├── quickstart.md        # Configuración y pruebas manuales
├── QA.md                # Resultados del QA
└── tasks.md             # Tareas y estado
```

### Código fuente

```text
src/
├── proxy.ts                  # rutas públicas y CSP con nonce
├── app/
│   ├── page.tsx              # guard de sesión
│   └── api/
│       ├── tasks/route.ts    # GET/POST/DELETE autenticados
│       └── realtime/token/route.ts
├── components/
│   ├── board/                # tablero, columnas, tarjetas, toolbar, métricas
│   ├── tasks/                # diálogos, formulario, etiquetas y fecha límite
│   └── ui/                   # shadcn/ui + connection-status
├── hooks/
│   ├── use-tasks-sync.ts     # carga, sondeo, foco/online y 401
│   └── use-tasks-realtime.ts # canal autenticado
├── lib/
│   ├── db.ts                 # pool único y TLS
│   ├── realtime-token.ts     # firma del JWT
│   ├── supabase-client.ts    # cliente nullable
│   ├── task-mapper.ts        # fila → Task
│   ├── tasks-repo.ts         # SQL parametrizado
│   ├── tasks-sync.ts         # cliente de /api/tasks
│   ├── task-utils.ts
│   ├── types.ts
│   ├── types/supabase.ts
│   └── validation.ts
└── store/
    └── task-store.ts
supabase/migrations/          # historial ordenado
tests/                        # Vitest
```

## Fases de implementación

### Fase 0: Investigación (`research.md`)

- [x] Elegir Supabase por Realtime gratuito y compatibilidad con Vercel.
- [x] Descartar WebSocket autohospedado en Vercel.
- [x] Decidir que el CRUD vive en el servidor y Realtime es solo lectura.
- [x] Documentar límites del plan gratuito y la política de migraciones.

### Fase 1: Diseño (`data-model.md`, `quickstart.md`)

- [x] Definir tabla, mapeo, índices, trigger, RLS y publicación Realtime.
- [x] Definir el flujo de escritura optimista y la recarga ante fallos.
- [x] Documentar la configuración local, en Vercel y en Supabase.
- [x] Documentar el orden y la reproducibilidad de las migraciones.

### Fase 2: Implementación (`tasks.md`)

- [x] API autenticada de tareas con SQL parametrizado y límite de lote.
- [x] Store en memoria con mutaciones optimistas y `replaceFromServer`.
- [x] Cliente de API con manejo de `401` y notificación de fallos.
- [x] Hook de carga inicial, sondeo, foco, reconexión y recuperación.
- [x] Token de Realtime y canal autenticado con mapeo de eventos.
- [x] Migraciones versionadas, RLS, índices, rate limit y publicación.
- [x] Pruebas unitarias de las funciones críticas.

### Fase 3: Verificación

- [x] `pnpm lint`.
- [x] `pnpm exec next typegen`.
- [x] `pnpm exec tsc --noEmit`.
- [x] `pnpm test` (46 pruebas).
- [x] `pnpm build`.
- [x] Realtime real: INSERT, UPDATE y DELETE recibidos por WebSocket.
- [x] QA manual con dos dispositivos el 11/11/2026.
- [x] CI en `.github/workflows/ci.yml`.

## Comandos de verificación

| Comando | Cuándo | Resultado esperado |
| --- | --- | --- |
| `pnpm lint` | Después de cada bloque de cambios | Sin errores ni warnings nuevos |
| `pnpm exec next typegen` | Antes de comprobar tipos | Tipos de rutas generados |
| `pnpm exec tsc --noEmit` | Después de tocar tipos, props o validación | Sin errores de tipos |
| `pnpm test` | Después de tocar dominio o validación | 46 pruebas en verde |
| `pnpm build` | Antes de cerrar la funcionalidad | Build de producción correcto |
| `pnpm dev` | Durante el QA manual | Tablero funcional en `localhost:3000` |

## Riesgos y mitigaciones

- **Carrera al conectar Realtime**: el stream de replicación tarda un instante en
  arrancar tras el join. La app no depende de un evento inmediato: hace una carga
  inicial por API y luego escucha cambios.
- **WebSocket caído**: sondeo cada 30 s, refresco al recuperar el foco y al volver
  la conexión.
- **Sesión caducada**: `401` cierra la sesión y redirige a `/login` en lugar de
  mostrar datos viejos.
- **Escritura fallida**: se avisa al usuario y se recarga el estado autoritativo.
- **Tareas ajenas**: `owner_id` se deriva de la sesión; RLS filtra los eventos por
  `sub`. Nunca se acepta un dueño enviado por el cliente.
- **Tokens de Realtime**: caducan a los 15 minutos y el hook los renueva antes de
  que expiren.
- **Migraciones divergentes**: los archivos locales usan las mismas versiones que el
  historial remoto; no se crean migraciones desde el panel.
- **Build de Vercel roto**: `pnpm build` y CI antes de integrar a `master`.

## Complejidad justificada

`@supabase/supabase-js` se mantiene solo para Realtime. El resto del acceso a datos
usa `pg` desde el servidor, lo que evita exponer PostgREST y permite derivar el
dueño de la sesión. La dependencia es una excepción permitida por la constitución
v3.0.0 y no sustituye a PostgreSQL como fuente de verdad.

## Seguimiento

- [x] Especificación clarificada y sin `[NEEDS CLARIFICATION]` pendientes.
- [x] Verificación constitucional aprobada.
- [x] `tasks.md` actualizado con el estado real.
- [x] `pnpm lint`, `next typegen`, `tsc --noEmit`, `pnpm test` y `pnpm build` en
  verde.
- [x] Realtime validado contra el proyecto real.
- [x] QA manual con dos dispositivos completado y documentado.
- [x] `master` desplegado en Vercel y verificado.
