# Tareas: Sincronización en tiempo real y multi-dispositivo

**Código**: 300-sync-realtime | **Estado**: Implementado; QA visual pendiente | **Fecha**: 2026-11-04 | **Actualizado**: 2026-11-09

---

## Fase 1: Configuración base

- [x] **T001** - Instalar dependencia `@supabase/supabase-js`
  - Archivo: `package.json`
  - Criterio: Versión 2.x instalada. ✅ 2.118.0

- [x] **T002** - Crear cliente Supabase singleton nullable
  - Archivo: `src/lib/supabase.ts`
  - Criterio: Devuelve cliente o `null` si faltan variables; no rompe el arranque.

- [x] **T003** - Crear hook `use-supabase`
  - Archivo: `src/hooks/use-supabase.ts`
  - Criterio: Expone el cliente inicializado.

- [x] **T004** - Crear hook `use-tasks-sync`
  - Archivo: `src/hooks/use-tasks-sync.ts`
  - Criterio: Carga inicial, Realtime, online/offline, reconciliación y migración.

---

## Fase 2: Modelo de datos

- [x] **T005** - Añadir columna `owner_id` (preparación futura)
  - Archivo: `supabase/migrations/20261109000000_align_tasks_schema.sql`
  - Criterio: Columna existe, nullable, con FK a `auth.users`.

- [x] **T006** - Crear trigger `updated_at`
  - Archivo: migración SQL
  - Criterio: `update_tasks_updated_at` actualiza `updated_at` en cada UPDATE.

- [x] **T007** - Crear índices para rendimiento
  - Archivo: migración SQL
  - Criterio: `idx_tasks_status`, `idx_tasks_order`, `idx_tasks_due_date` y
    `idx_tasks_status_order`.

- [x] **T007b** - Alinear tipos y restricciones
  - Archivo: migración SQL
  - Criterio: `description` nullable, `tags` no nulo, `order` integer, CHECK de
    `status`, `priority` y `due_date`.

---

## Fase 3: Store (Zustand)

- [x] **T008** - Extender `TaskStore`
  - Archivo: `src/store/task-store.ts`
  - Criterio: Métodos `syncFromSupabase`, `addTaskRemote`, `updateTaskRemote` y
    `deleteTaskRemote`.

- [x] **T009** - Implementar `syncFromSupabase`
  - Criterio: Reemplaza el estado con las tareas reconciliadas.

- [x] **T010** - Implementar `addTaskRemote`
  - Criterio: Añade sin generar UUID nuevo y sin duplicar.

- [x] **T011** - Implementar `updateTaskRemote`
  - Criterio: Actualiza la tarea completa por `id`.

- [x] **T012** - Implementar `deleteTaskRemote`
  - Criterio: Elimina por `id`.

- [x] **T013** - Suscripción Realtime
  - Archivo: `src/hooks/use-tasks-sync.ts` (en lugar del store)
  - Criterio: Canal `public:tasks` con INSERT, UPDATE y DELETE; `removeChannel` al
    desmontar.

---

## Fase 4: Sincronizar operaciones existentes

- [x] **T014** - `addTask` → Supabase
- [x] **T015** - `updateTask` → Supabase
- [x] **T016** - `deleteTask` → Supabase
- [x] **T017** - `moveTask` → Supabase (status y order)
- [x] **T017b** - Sincronizar duplicar, restaurar, limpiar completadas, importar y
  cargar ejemplos mediante diff de tareas.

---

## Fase 5: Componentes de UI

- [x] **T018** - Crear `ConnectionStatus`
  - Archivo: `src/components/ui/connection-status.tsx`
  - Criterio: Badge con estados, `aria-live`, iconos y hora de última sincronización.

- [x] **T019** - Integrar el badge en el tablero
  - Archivo: `src/components/board/task-board.tsx`
  - Criterio: Visible en el header del tablero, responsive.

- [x] **T020** - Diálogo de sincronización de tareas locales
  - Archivo: `src/components/ui/connection-status.tsx`
  - Criterio: Lista tareas solo locales, permite subirlas o posponerlas y reabrir.

---

## Fase 6: Migración de datos

- [x] **T021** - Migración local `taskboard:v1` → `taskboard:v2`
  - Archivo: `src/lib/storage-migration.ts`
  - Criterio: Copia sin borrar `v1`; tolera errores de `localStorage`.

- [x] **T022** - Detección de tareas solo locales
  - Archivo: `src/hooks/use-tasks-sync.ts`
  - Criterio: La reconciliación devuelve `localOnly` y dispara el diálogo.

- [x] **T022b** - Subida manual de tareas locales
  - Archivo: `src/lib/supabase-sync.ts`
  - Criterio: `pushTasks` hace `upsert` por `id` y actualiza el estado del badge.

---

## Fase 7: Errores y fallback

- [x] **T023** - Detección online/offline
  - Archivo: `src/hooks/use-tasks-sync.ts`
  - Criterio: Eventos `online`/`offline`, reintento y estado visual.

- [x] **T024** - Fallback a localStorage
  - Archivo: `src/lib/supabase.ts`, `src/store/task-store.ts`
  - Criterio: Sin Supabase la app funciona en modo local.

- [x] **T025** - Cola de cambios pendientes
  - Archivo: `src/lib/sync-queue.ts`, `src/lib/supabase-sync.ts`
  - Criterio: Operaciones en `taskboard:sync-queue`, vaciado ordenado y reintento.

- [x] **T025b** - Reconciliación por `updatedAt`
  - Archivo: `src/lib/task-sync.ts`
  - Criterio: Gana la tarea más reciente; no se pierden tareas solo remotas o solo
    locales.

---

## Fase 8: Variables de entorno y documentación

- [x] **T026** - Crear `.env.example`
  - Archivo: `.env.example`
  - Criterio: Variables públicas documentadas sin valores reales.

- [x] **T027** - Actualizar documentación
  - Archivos: `README.md`, `GUIA.md`, `AGENTS.md`, `PROGRESS.md`
  - Criterio: Configuración local/Vercel, migración, seguridad y estado real.

- [x] **T027b** - Actualizar artefactos SDD
  - Archivos: `specs/300-sync-realtime/*`
  - Criterio: Spec, plan, research, data-model, quickstart, tasks y QA coherentes.

- [x] **T027c** - Aplicar constitución v2.1.0
  - Archivo: `.specify/memory/constitution.md`
  - Criterio: Persistencia híbrida y Supabase permitidos.

---

## Fase 9: QA y verificación

- [x] **T028** - QA API REST: crear/editar/borrar
  - Archivo: `QA.md`
  - Criterio: INSERT `201`, UPDATE `200`, SELECT `200`, DELETE `200`.

- [x] **T028b** - QA Realtime
  - Archivo: `QA.md`
  - Criterio: INSERT, UPDATE y DELETE recibidos por WebSocket.

- [x] **T028c** - Permisos de tabla
  - Archivo: migración SQL
  - Criterio: `GRANT` a `anon`/`authenticated`; sin `42501`.

- [ ] **T029** - QA visual: Drag & Drop
  - Archivo: `QA.md`
  - Criterio: Movimientos se sincronizan sin lag entre pestañas.

- [ ] **T030** - QA visual: Offline/Online
  - Archivo: `QA.md`
  - Criterio: La app funciona offline y vacía la cola al reconectar.

- [ ] **T031** - QA visual: Múltiples dispositivos
  - Archivo: `QA.md`
  - Criterio: Sincronización real entre dos dispositivos.

- [x] **T032** - Verificar build de producción
  - Comando: `pnpm build`
  - Criterio: Build sin errores.

- [ ] **T033** - Verificar despliegue en Vercel
  - Criterio: Deployment `READY` y variables de Supabase aplicadas.

---

## Puertas de calidad (antes de integrar a `master`)

```bash
pnpm lint
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm build
```

Y el QA manual de `QA.md` (los casos visuales siguen pendientes).

---

## Enmienda constitucional

- [x] Constitución actualizada a v2.1.0:
  - persistencia híbrida local + Supabase;
  - Supabase Realtime en lugar de WebSocket autohospedado;
  - modo local como fallback.

---

## Dependencias cruzadas

| Tarea | Depende de | Bloquea |
|-------|------------|---------|
| T009-T013 | T002, T004 | T014-T017 |
| T014-T017 | T008-T013, T018 | T020 |
| T018-T020 | T001-T004 | T023-T025 |
| T021-T022 | T001-T004 | T026-T027 |
| T023-T025 | T014-T017, T020 | T028-T031 |

---

## Notas

- **Clave local**: `taskboard:v2`, con migración desde `taskboard:v1`.
- **WebSocket**: Supabase Realtime; sin autohospedaje.
- **Límite gratuito**: 500k mensajes/mes, suficiente para el MVP.
- **Pendiente real**: QA visual humano y verificación del deployment.
