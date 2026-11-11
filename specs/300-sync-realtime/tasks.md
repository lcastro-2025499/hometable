# Tareas: Sincronización en tiempo real y multi-dispositivo

**Código**: 300-sync-realtime | **Estado**: Implementado y verificado | **Fecha**:
2026-11-04 | **Actualizado**: 2026-11-11

---

## Fase 1: Configuración base

- [x] **T001** - Instalar `@supabase/supabase-js`
  - Archivo: `package.json`
  - Criterio: Versión 2.x instalada. ✅ 2.119.0

- [x] **T002** - Crear cliente Supabase singleton nullable
  - Archivo: `src/lib/supabase-client.ts`
  - Criterio: Devuelve `null` si faltan variables; no rompe el arranque y solo se
    usa para Realtime.

- [x] **T003** - Crear hook `use-tasks-sync`
  - Archivo: `src/hooks/use-tasks-sync.ts`
  - Criterio: Carga inicial, sondeo cada 30 s, refresco al recuperar foco y al
    volver la conexión, manejo de `401`.

- [x] **T004** - Crear hook `use-tasks-realtime`
  - Archivo: `src/hooks/use-tasks-realtime.ts`
  - Criterio: Pide token, abre el canal, mapea eventos propios, renueva el token y
    reintenta.

---

## Fase 2: Modelo de datos y migraciones

- [x] **T005** - Crear la tabla `tasks` y su esquema base
  - Archivo: `supabase/migrations/20261109151132_align_tasks_schema_and_realtime.sql`
  - Criterio: Columnas, CHECK, trigger, publicación Realtime.

- [x] **T006** - Crear las tablas de Better Auth y `board`
  - Archivo: `supabase/migrations/20261109151500_better_auth_tables.sql`
  - Criterio: `user`, `session`, `account`, `verification`, `board` y `owner_id`
    como `text` con FK a `public."user"`.

- [x] **T007** - Ordenar las migraciones según el historial remoto
  - Archivos: `supabase/migrations/20261109152043_*`,
    `20261109152450_*`, `20261110161929_*`, `20261110171312_*`,
    `20261110200442_*`
  - Criterio: Un proyecto vacío puede aplicar todos los archivos en orden.

- [x] **T008** - Añadir Realtime de solo lectura por dueño
  - Archivo: `supabase/migrations/20261111161842_realtime_owner_read.sql`
  - Criterio: `REPLICA IDENTITY FULL`, `GRANT SELECT` a `authenticated`, policy
    por `auth.jwt() ->> 'sub'` y alta en la publicación.

- [x] **T009** - Añadir rate limit persistente
  - Archivo: `supabase/migrations/20261111162025_auth_rate_limit.sql`
  - Criterio: Tabla `auth_rate_limit` con RLS y sin grants públicos.

- [x] **T010** - Indexar por dueño
  - Archivo: `supabase/migrations/20261111162255_tasks_owner_indexes.sql`
  - Criterio: `(owner_id, status, "order")` y `(owner_id, created_at desc)`.

- [x] **T011** - Endurecer policy y trigger
  - Archivos: `20261111174752_harden_policy_and_function.sql` y
    `20261111174801_harden_realtime_policy_jwt_subquery.sql`
  - Criterio: `auth.jwt()` en subconsulta, `search_path = ''` y
    `pg_catalog.now()`.

- [x] **T012** - Hacer `owner_id` obligatorio
  - Archivo: `supabase/migrations/20261112040000_tasks_owner_not_null_and_board_index.sql`
  - Criterio: `owner_id NOT NULL` e índice `idx_board_owner_id`; sin filas
    huérfanas antes de aplicar.

---

## Fase 3: API y store

- [x] **T013** - CRUD autenticado en `/api/tasks`
  - Archivo: `src/app/api/tasks/route.ts`
  - Criterio: `GET`, `POST` y `DELETE`; `401` sin sesión, `403` sin verificar y
    `403` desde otro origen.

- [x] **T014** - Repositorio SQL parametrizado
  - Archivo: `src/lib/tasks-repo.ts`
  - Criterio: Zod por tarea, `owner_id` de la sesión, máximo 500 tareas y
    `{ accepted, rejected }`.

- [x] **T015** - Cliente de API
  - Archivo: `src/lib/tasks-sync.ts`
  - Criterio: `fetchRemoteTasks`, `pushTasks`, `deleteTasks`, manejadores de fallo
    y de `401`.

- [x] **T016** - Store en memoria
  - Archivo: `src/store/task-store.ts`
  - Criterio: Sin `persist`, con `replaceFromServer` y mutaciones optimistas.

- [x] **T017** - Integrar el store con la API
  - Archivo: `src/components/board/task-board.tsx`
  - Criterio: Carga inicial, esqueleto, mutaciones y recarga ante fallos.

---

## Fase 4: Realtime

- [x] **T018** - Emitir el token de Realtime
  - Archivo: `src/app/api/realtime/token/route.ts` y `src/lib/realtime-token.ts`
  - Criterio: JWT HS256 de 15 min con `sub`, `role=authenticated` y
    `aud=authenticated`; `401`/`403`/`503` según corresponda.

- [x] **T019** - Autenticar el canal
  - Archivo: `src/hooks/use-tasks-realtime.ts`
  - Criterio: `setAuth`, filtro por dueño, `subscribe`, renovación antes de expirar
    y reintento con retardo.

- [x] **T020** - Mapear eventos
  - Archivo: `src/lib/task-mapper.ts`
  - Criterio: `rowToTask` normaliza fechas y descarta estados/prioridades
    inválidos.

- [x] **T021** - Resincronizar al suscribirse
  - Archivo: `src/hooks/use-tasks-realtime.ts`
  - Criterio: Una carga por API tras `SUBSCRIBED` para cubrir la carrera inicial.

---

## Fase 5: UI y errores

- [x] **T022** - Badge de sincronización
  - Archivo: `src/components/ui/connection-status.tsx`
  - Criterio: Estados, `aria-live`, iconos y hora de última sincronización.

- [x] **T023** - Notificación de fallos
  - Archivo: `src/hooks/use-tasks-sync.ts`
  - Criterio: `toast` y recarga del estado autoritativo.

- [x] **T024** - Manejo de sesión caducada
  - Archivos: `src/lib/tasks-sync.ts` y `src/hooks/use-tasks-sync.ts`
  - Criterio: `signOut` y redirección a `/login`.

- [x] **T025** - Eliminar la persistencia local de tareas
  - Archivos: `src/store/task-store.ts`, `src/components/board/task-board.tsx`
  - Criterio: Sin `persist`, sin listener de `storage`, sin datos de ejemplo y sin
    importación/exportación.

---

## Fase 6: Pruebas y documentación

- [x] **T026** - Pruebas unitarias
  - Archivos: `tests/task-utils.test.ts`, `tests/validation.test.ts`,
    `tests/auth-validation.test.ts`, `tests/task-mapper.test.ts`,
    `tests/http.test.ts`, `tests/realtime-token.test.ts`
  - Criterio: 46 pruebas en verde con `pnpm test`.

- [x] **T027** - Integración continua
  - Archivo: `.github/workflows/ci.yml`
  - Criterio: install, lint, typegen, tsc, test y build en cada push/PR.

- [x] **T028** - Documentación
  - Archivos: `README.md`, `.env.example`, `PROGRESS.md`,
    `.specify/memory/constitution.md`, `specs/300-sync-realtime/*`
  - Criterio: Reflejan la arquitectura server-first, Realtime autenticado y la
    política de migraciones.

---

## Fase 7: QA

- [x] **T029** - QA de esquema y permisos
  - Archivo: `QA.md`
  - Criterio: `owner_id NOT NULL`, índices, policy activa y publicación.

- [x] **T030** - QA de API
  - Archivo: `QA.md`
  - Criterio: `401` sin sesión, `403` sin verificar y `403` desde otro origen;
    CRUD correcto con sesión.

- [x] **T031** - QA de Realtime
  - Archivo: `QA.md`
  - Criterio: INSERT, UPDATE y DELETE recibidos; solo filas propias.

- [x] **T032** - QA visual con dos dispositivos
  - Archivo: `QA.md`
  - Criterio: Cambios propagados en ambos sentidos el 11/11/2026.

- [x] **T033** - QA de respaldo
  - Archivo: `QA.md`
  - Criterio: Con Realtime deshabilitado, el sondeo mantiene el tablero al día.

- [x] **T034** - Puertas y despliegue
  - Criterio: lint, typegen, tsc, test y build en verde; deployment `READY` en
    Vercel.

---

## Puertas de calidad (antes de integrar a `master`)

```bash
pnpm lint
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

Y el QA manual de `QA.md`.

---

## Dependencias cruzadas

| Tarea | Depende de | Bloquea |
|-------|------------|---------|
| T005-T012 | Proyecto Supabase | T013-T021 |
| T013-T017 | T005-T012 | T022-T025 |
| T018-T021 | T008, T011, T013 | T022-T025 |
| T026-T027 | T013-T021 | T034 |
| T029-T033 | T013-T021 | T034 |

---

## Notas

- **Fuente de verdad**: PostgreSQL. Sin cola offline ni reconciliación.
- **WebSocket**: Supabase Realtime, autenticado con JWT corto y limitado por RLS.
- **Respaldo**: sondeo cada 30 s, foco y reconexión.
- **Migraciones**: mismas versiones que el historial remoto; no se crean desde el
  panel.
- **Pendiente fuera de alcance**: tableros compartidos, invitaciones y chat.
