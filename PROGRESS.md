# PROGRESS.md: Estado del proyecto Hometable

## Resumen

- **Versión**: 2.1.0 (sincronización multi-dispositivo).
- **Fecha**: 2026-11-09.
- **Estado**: Implementación completada y validada por API/Realtime; pendiente el QA
  visual humano y la verificación del despliegue en Vercel.
- **Modo de persistencia**: híbrido. `localStorage` (`taskboard:v2`) como respaldo y
  Supabase como sincronización opcional.

---

## Completado

### Base de datos

- [x] Proyecto Supabase `tfjbkvxxdglxujnrcaeb`.
- [x] Migración versionada
  `supabase/migrations/20261109000000_align_tasks_schema.sql`.
- [x] Tabla `tasks` alineada: `description` nullable, `tags` no nulo, `order`
  integer, `owner_id` preparado.
- [x] CHECK de `status`, `priority` y `due_date`.
- [x] Índices `idx_tasks_status`, `idx_tasks_order`, `idx_tasks_due_date` y
  `idx_tasks_status_order`.
- [x] Trigger `update_tasks_updated_at`.
- [x] RLS con políticas públicas de MVP.
- [x] `GRANT select, insert, update, delete` a `anon` y `authenticated`.
- [x] Tabla añadida a la publicación `supabase_realtime`.
- [x] Migración reproducible desde un proyecto vacío.

### Código

- [x] Dependencia `@supabase/supabase-js` 2.x.
- [x] Cliente Supabase singleton nullable (`src/lib/supabase.ts`).
- [x] Tipos generados (`src/lib/types/supabase.ts`) y mapeo
  (`src/lib/task-mapper.ts`).
- [x] Writers REST y cola offline (`src/lib/supabase-sync.ts`,
  `src/lib/sync-queue.ts`).
- [x] Reconciliación por `updatedAt` (`src/lib/task-sync.ts`).
- [x] Migración `taskboard:v1` → `taskboard:v2`
  (`src/lib/storage-migration.ts`).
- [x] Store sincroniza crear, editar, duplicar, borrar, deshacer, limpiar
  completadas, importar y drag & drop.
- [x] Hook `use-tasks-sync` con carga inicial, Realtime, online/offline y diálogo de
  tareas solo locales.
- [x] Badge de estado `ConnectionStatus` integrado en el tablero.
- [x] Textos y metadatos actualizados para reflejar el modo híbrido.

### Verificación

- [x] `pnpm lint` sin errores.
- [x] `pnpm exec next typegen`.
- [x] `pnpm exec tsc --noEmit` sin errores.
- [x] `pnpm build` correcto.
- [x] REST real: INSERT `201`, UPDATE `200`, SELECT `200`, DELETE `200`.
- [x] Realtime real: INSERT, UPDATE y DELETE recibidos por WebSocket.
- [x] Tabla de prueba limpiada después del QA.

### Documentación

- [x] Constitución v2.1.0 aplicada.
- [x] `README.md`, `GUIA.md`, `AGENTS.md` y `PROGRESS.md` actualizados.
- [x] Artefactos SDD en `specs/300-sync-realtime/`.
- [x] `.env.example` con las variables públicas.
- [x] Variables configuradas en Vercel para Production, Preview y Development.

---

## Pendiente

### 1. QA visual manual (prioridad alta)

Requiere un navegador humano. Detalle en `specs/300-sync-realtime/QA.md`:

- [ ] Crear/editar/mover/borrar y ver el reflejo en otra pestaña.
- [ ] Drag & drop sincronizado.
- [ ] Diálogo de tareas solo locales.
- [ ] Offline → online con cola de cambios.
- [ ] Dos dispositivos físicos.
- [ ] Badge de estado y tooltips.
- [ ] Consola sin errores.

### 2. Verificación del despliegue

- [ ] Push a `master`.
- [ ] Deployment de Vercel en estado `READY`.
- [ ] Probar la URL de producción con las variables de Supabase.

### 3. Autenticación (fase futura)

- [ ] Cuentas de usuario.
- [ ] Políticas RLS por `owner_id`.
- [ ] Tableros privados por usuario.

### 4. Mejoras opcionales

- [ ] Sincronizar filtros y preferencias.
- [ ] Notificaciones de sincronización.
- [ ] Pruebas automatizadas de la capa de sync.

---

## Notas técnicas

### Realtime y permisos

El error `42501 permission denied for table tasks` no se resuelve solo con RLS: los
roles del cliente necesitan `GRANT` explícito. La migración ya lo incluye.

### Carrera al conectar

Insertar justo en el callback `SUBSCRIBED` puede perder el evento porque la conexión
de replicación aún arranca. La app carga primero por REST y luego escucha cambios; el
QA de Realtime espera unos segundos tras suscribirse.

### Costos

Plan gratuito de Supabase: 500 MB y 500k mensajes Realtime/mes. Sin costo para el
MVP.

---

## Enlaces

- [Supabase](https://supabase.com/docs)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Row Level Security](https://supabase.com/docs/guides/database/row-level-security)
- [Vercel](https://vercel.com)
