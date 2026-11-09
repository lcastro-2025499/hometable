# Especificación: Sincronización en tiempo real y multi-dispositivo

**Código**: 300-sync-realtime | **Autor**: Equipo de desarrollo | **Fecha**: 2026-11-04 | **Estado**: Implementado (2026-11-09)

---

## 1. Resumen

Hometable pasa de una SPA con persistencia exclusivamente local a una aplicación
con **persistencia híbrida**: `localStorage` sigue siendo la fuente de respaldo y
Supabase añade sincronización multi-dispositivo en tiempo real. Los cambios en las
tareas (crear, mover, editar, borrar) se guardan de forma optimista en local y se
replican a Supabase; los demás clientes reciben el cambio por WebSocket.

La sincronización es **opcional**: si faltan las variables de entorno o no hay
conexión, la app funciona igual que antes en modo local.

---

## 2. Contexto actual

- **Arquitectura**: SPA sin backend propio, desplegada en Vercel.
- **Persistencia local**: clave `taskboard:v2`; los datos de `taskboard:v1` se
  migran automáticamente conservando el respaldo original.
- **Sincronización entre pestañas**: evento `storage` del navegador.
- **Stack**: Next.js 16, React 19, TypeScript 5, Zustand 5, Tailwind CSS 4.
- **Servicio externo opcional**: Supabase (capa gratuita) para Postgres, API REST
  y Realtime.

---

## 3. Objetivo del Spec

Definir la integración de Supabase para:

1. **Base de datos**: mapear `Task` a la tabla PostgreSQL `tasks`.
2. **Cliente**: configurar `@supabase/supabase-js` con un cliente nullable.
3. **Sincronización**: enviar cada mutación y escuchar cambios por Realtime.
4. **Transición suave**: fallback a `localStorage` y cola de operaciones offline.
5. **Datos locales preservados**: migrar `taskboard:v1` → `taskboard:v2` y ofrecer
   subir al remoto las tareas que solo existen en local.

---

## 4. Supuestos

### 4.1 Base de datos

**Elección definitiva**: **Supabase** (versión gratuita).

| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| PostgreSQL nativo en Vercel | Integración nativa | No soporta WebSocket persistente | ❌ Rechazada |
| Firebase | Muy sencillo | Límite de lecturas/escrituras bajo | ❌ Rechazada |
| Supabase | Gratuito, WebSocket, SQL completo | Requiere migración | ✅ Elegida |

### 4.2 Variables de entorno

Solo se usan variables públicas, aptas para el navegador:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-public-key]
```

No se usa `SUPABASE_SERVICE_ROLE_KEY` en la aplicación: cualquier clave secreta
debe permanecer fuera del cliente y de Vercel si no se necesita.

### 4.3 Transición de datos

- Los usuarios existentes con `taskboard:v1` conservan sus datos: la app copia las
  tareas a `taskboard:v2` sin borrar la clave anterior.
- Al conectar con Supabase se ofrece subir las tareas que solo existen en local.
- Si se rechaza, la app sigue funcionando en local y el aviso queda disponible.

---

## 5. Modelo de datos

### 5.1 Tabla `tasks`

La fuente de verdad versionada es
`supabase/migrations/20261109000000_align_tasks_schema.sql`.

```sql
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'low'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date date,
  tags text[] not null default '{}',
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  owner_id uuid references auth.users(id) on delete set null
);
```

Además, la migración:

- actualiza `updated_at` con un trigger `BEFORE UPDATE`;
- crea los índices `idx_tasks_status`, `idx_tasks_order`, `idx_tasks_due_date` y
  `idx_tasks_status_order`;
- habilita RLS con políticas públicas de MVP;
- concede `select, insert, update, delete` a `anon` y `authenticated`;
- añade `tasks` a la publicación `supabase_realtime`.

`owner_id` queda preparado para autenticación futura, pero no se usa en el MVP.

### 5.2 Mapeo de campos (Task ↔ Supabase)

| Task (app) | Supabase (DB) | Comentario |
|------------|---------------|------------|
| `id: string` | `id: uuid` | UUID v4 generado en el cliente |
| `title: string` | `title: text` | Máx. 120 caracteres |
| `description?: string` | `description: text` | Nullable |
| `status: TaskStatus` | `status: text` | CHECK de dominio |
| `priority: TaskPriority` | `priority: text` | CHECK de dominio |
| `dueDate?: string` | `due_date: date` | Formato `yyyy-MM-dd` |
| `tags: string[]` | `tags: text[]` | Default `{}` |
| `order: number` | `"order": integer` | Posición en la columna |
| `createdAt: string` | `created_at: timestamptz` | Enviado por el cliente |
| `updatedAt: string` | `updated_at: timestamptz` | Trigger en UPDATE |
| `completedAt?: string` | `completed_at: timestamptz` | Nullable |

El mapeo vive en `src/lib/task-mapper.ts` y los tipos generados en
`src/lib/types/supabase.ts`.

---

## 6. Arquitectura de sincronización

### 6.1 Escritura

```text
[UI: formulario / drag & drop]
        ↓
[Zustand actualiza el estado de forma optimista]
        ↓
[supabase-sync.pushTasks / deleteTasks]
        ↓ (online)                         ↓ (offline o error)
[REST INSERT/UPDATE/DELETE]          [cola taskboard:sync-queue]
        ↓
[Supabase emite el cambio por Realtime]
        ↓
[Otros clientes actualizan Zustand]
```

- Cada mutación del store calcula el diff real de tareas para no reenviar todo el
  tablero.
- `moveTask` también sincroniza `status` y `order`.
- Las operaciones fallidas se guardan en la cola y se reintentan al reconectar.

### 6.2 Lectura e inicialización

```text
[App arranca]
      ↓
[migrateLegacyStorage: taskboard:v1 → taskboard:v2]
      ↓
[flushSyncQueue: sube pendientes]
      ↓
[fetchRemoteTasks: SELECT de tasks]
      ↓
[reconcileTasks: local vs remoto por updatedAt]
      ↓
[Zustand actualiza el tablero]
```

### 6.3 Reconciliación y conflictos

- Gana la tarea con `updatedAt` más reciente.
- Las tareas que solo existen en local se muestran en un diálogo para subirlas.
- Las que solo existen en remoto se incorporan al estado local.
- La cola offline se vacía antes de reconciliar para no interpretar cambios propios
  como tareas ajenas.

---

## 7. Cambios en el stack

### 7.1 Dependencia nueva

```bash
pnpm add @supabase/supabase-js
```

### 7.2 Archivos relevantes

```text
src/
├── hooks/
│   ├── use-supabase.ts        # acceso al cliente nullable
│   └── use-tasks-sync.ts      # carga, Realtime, online/offline y migración
├── lib/
│   ├── supabase.ts            # cliente singleton opcional
│   ├── supabase-sync.ts       # writers, fetch y flush de la cola
│   ├── sync-queue.ts          # cola offline en localStorage
│   ├── task-sync.ts           # reconciliación por updatedAt
│   ├── task-mapper.ts         # Task ↔ fila de Supabase
│   ├── storage-migration.ts   # taskboard:v1 → taskboard:v2
│   └── types/supabase.ts      # tipos generados desde Supabase
├── components/ui/connection-status.tsx
└── store/task-store.ts        # mutaciones + estado remoto
```

### 7.3 Store

El store expone los métodos remotos `syncFromSupabase`, `addTaskRemote`,
`updateTaskRemote` y `deleteTaskRemote`. La suscripción Realtime vive en
`use-tasks-sync` para mantener el store libre de efectos del navegador.

---

## 8. UX / Interacción

| Estado | Indicador |
|--------|-----------|
| Supabase no configurado | Badge gris "Solo local" |
| Conectando | Spinner "Conectando..." |
| Conectado | Badge verde "Sincronizado" con hora |
| Sin conexión | Badge gris "Sin conexión" |
| Error | Badge rojo con tooltip y reintento |

Cuando hay tareas solo locales aparece un diálogo con la opción **Subir tareas** o
**Ahora no**. El badge también permite reabrir el diálogo.

---

## 9. Seguridad

- RLS habilitado con políticas públicas de MVP (`using (true)`), documentadas en la
  migración.
- Los roles `anon` y `authenticated` tienen permisos explícitos sobre la tabla;
  sin ellos la API REST devuelve `42501 permission denied`.
- La `anon key` es pública por diseño; la seguridad real depende de RLS.
- No hay autenticación individual todavía. `owner_id` y las políticas por usuario
  quedan como trabajo futuro.
- `.env.local` está ignorado por git; `.env.example` documenta las variables.

---

## 10. Migración de datos

1. **Local**: `migrateLegacyStorage()` copia `taskboard:v1` a `taskboard:v2` antes
   de que Zustand hidrate. `taskboard:v1` se conserva como respaldo.
2. **Remoto**: al conectar, las tareas que solo existen en local se ofrecen mediante
   el diálogo de sincronización; al aceptar se hace `upsert` por `id`.
3. **Exportación/importación JSON**: sigue disponible como respaldo manual.

---

## 11. Casos de uso

### CU-001: Crear tarea en tiempo real

1. El formulario valida con Zod y llama a `addTask()`.
2. Zustand añade la tarea y actualiza `localStorage`.
3. `pushTasks()` hace `upsert` en Supabase.
4. Realtime emite `INSERT`; los demás clientes llaman a `addTaskRemote()`.

### CU-002: Mover tarea (drag & drop)

1. `moveTask()` actualiza `status` y `order` de forma optimista.
2. El diff se envía a Supabase.
3. Realtime emite `UPDATE`; los demás clientes actualizan la tarjeta.

### CU-003: Conexión perdida y recuperada

1. La app detecta `offline` y muestra "Sin conexión".
2. Las mutaciones se guardan en `taskboard:sync-queue`.
3. Al volver `online`, se vacía la cola y se reconcilia con el remoto.

---

## 12. Criterios de aceptación

### CA-001: Base de datos

- [x] Tabla `tasks` con el esquema definido.
- [x] Índices creados.
- [x] Trigger `updated_at` funcionando.
- [x] RLS, permisos y publicación Realtime configurados.
- [x] Migración versionada y reproducible desde un proyecto vacío.

### CA-002: Cliente Supabase

- [x] Cliente singleton nullable.
- [x] Variables de entorno documentadas y configuradas en Vercel.
- [x] La app funciona sin Supabase (modo local).

### CA-003: Sincronización

- [x] INSERT, UPDATE y DELETE llegan a Supabase (probado por REST).
- [x] Realtime entrega INSERT, UPDATE y DELETE (probado por WebSocket).
- [x] Al recargar se cargan los datos de Supabase.
- [x] Drag & drop sincroniza `status` y `order`.
- [x] Cola offline y reconciliación por `updatedAt`.

### CA-004: Transición

- [x] `taskboard:v1` → `taskboard:v2` automático.
- [x] Diálogo para subir tareas solo locales.
- [x] Badge de estado y reintento automático.
- [ ] Validación visual manual en navegador (drag & drop, diálogo, offline/online y
  dos dispositivos). Pendiente de QA humano; ver `QA.md`.

---

## 13. Enmienda constitucional

**Artículo VI (modificado)**:

> Están fuera de alcance: cuentas de usuario complejas y notificaciones push.
> **Permitido**: sincronización entre dispositivos y colaboración en tiempo real
> mediante Supabase (capa gratuita), manteniendo `localStorage` como respaldo.

---

**Versión**: 1.1.0 | **Estado**: Implementado con QA visual pendiente
