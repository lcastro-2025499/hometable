# Data Model: Sincronización en tiempo real y multi-dispositivo

**Código**: 300-sync-realtime | **Fecha**: 2026-11-04 | **Actualizado**: 2026-11-09

---

## 1. Modelo de dominio

La interfaz `Task` no cambia (`src/lib/types.ts`):

```typescript
export interface Task {
  id: string;             // UUID v4 generado en el cliente
  title: string;          // Máx. 120 caracteres
  description?: string;   // Máx. 1000 caracteres
  status: TaskStatus;     // 'todo' | 'in_progress' | 'done'
  priority: TaskPriority; // 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string;       // yyyy-MM-dd
  tags: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
```

---

## 2. Modelo de datos en Supabase

### 2.1 Esquema real

Fuente de verdad:
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

create index idx_tasks_status on public.tasks (status);
create index idx_tasks_order on public.tasks ("order");
create index idx_tasks_due_date on public.tasks (due_date);
create index idx_tasks_status_order on public.tasks (status, "order");
```

La migración también crea el trigger `update_tasks_updated_at`, habilita RLS con
políticas públicas, concede permisos a `anon`/`authenticated` y añade la tabla a la
publicación `supabase_realtime`.

### 2.2 Mapeo detallado

| Task (app) | Supabase (DB) | Tipo SQL | Nullable | Default | Comentario |
|------------|---------------|----------|----------|---------|------------|
| `id` | `id` | UUID | NO | `gen_random_uuid()` | UUID v4 del cliente |
| `title` | `title` | TEXT | NO | - | Máx. 120 caracteres |
| `description` | `description` | TEXT | SÍ | NULL | Máx. 1000 caracteres |
| `status` | `status` | TEXT CHECK | NO | `'todo'` | Dominio validado |
| `priority` | `priority` | TEXT CHECK | NO | `'low'` | Dominio validado |
| `dueDate` | `due_date` | DATE | SÍ | NULL | `yyyy-MM-dd` |
| `tags` | `tags` | TEXT[] | NO | `'{}'` | Array PostgreSQL |
| `order` | `"order"` | INTEGER | NO | 0 | Orden en columna |
| `createdAt` | `created_at` | TIMESTAMPTZ | NO | `NOW()` | Enviado por el cliente |
| `updatedAt` | `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Trigger en UPDATE |
| `completedAt` | `completed_at` | TIMESTAMPTZ | SÍ | NULL | Opcional |
| — | `owner_id` | UUID | SÍ | NULL | Futuro auth; no usado en MVP |

El mapeo TypeScript está en `src/lib/task-mapper.ts`; los tipos generados desde
Supabase, en `src/lib/types/supabase.ts`.

---

## 3. Trigger de `updated_at`

```sql
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_tasks_updated_at
  before update on public.tasks
  for each row
  execute function public.update_updated_at_column();
```

El cliente también envía `updatedAt` al hacer `upsert`, pero en un UPDATE el trigger
impone la hora del servidor. La reconciliación usa el valor remoto recibido, por lo
que el resultado es consistente entre dispositivos.

### 3.1 Reordenamiento

No se implementó la función RPC `reorder_tasks` del diseño inicial. El MVP reordena
en el cliente y envía un `upsert` con las tareas cuyo `order` o `status` cambió. Es
suficiente para el tamaño del tablero y evita lógica duplicada en la base de datos.

---

## 4. Row Level Security (RLS)

### 4.1 Políticas del MVP

```sql
alter table public.tasks enable row level security;

create policy "public select" on public.tasks for select using (true);
create policy "public insert" on public.tasks for insert with check (true);
create policy "public update" on public.tasks for update using (true);
create policy "public delete" on public.tasks for delete using (true);

grant select, insert, update, delete on table public.tasks to anon, authenticated;
```

> RLS filtra filas, pero los roles del cliente necesitan privilegios explícitos sobre
> la tabla. Sin el `GRANT`, PostgREST devuelve `42501 permission denied`.

### 4.2 Políticas futuras (con auth)

```sql
create policy "tasks_user_select" on public.tasks
  for select using (auth.uid() = owner_id);
create policy "tasks_user_insert" on public.tasks
  for insert with check (auth.uid() = owner_id);
create policy "tasks_user_update" on public.tasks
  for update using (auth.uid() = owner_id);
create policy "tasks_user_delete" on public.tasks
  for delete using (auth.uid() = owner_id);
```

`owner_id` ya existe para preparar esta transición sin migración destructiva.

---

## 5. Persistencia local y migración

### 5.1 Claves de `localStorage`

| Clave | Uso |
|-------|-----|
| `taskboard:v2` | Estado actual de Zustand (`{ state: { tasks }, version }`) |
| `taskboard:v1` | Respaldo histórico; se conserva tras migrar |
| `taskboard:sync-queue` | Operaciones pendientes mientras no hay conexión |

### 5.2 Migración `taskboard:v1` → `taskboard:v2`

`src/lib/storage-migration.ts`:

1. Si `taskboard:v2` ya existe, no hace nada.
2. Lee `taskboard:v1` y extrae `state.tasks` o `tasks`.
3. Escribe `taskboard:v2` sin borrar `taskboard:v1`.
4. Si `localStorage` falla, la app arranca vacía sin romperse.

### 5.3 Formato remoto (upsert)

```json
{
  "id": "uuid-v4",
  "title": "Mi tarea",
  "description": "Detalle",
  "status": "todo",
  "priority": "high",
  "due_date": "2026-12-31",
  "tags": ["trabajo", "importante"],
  "order": 0,
  "created_at": "2026-11-04T10:00:00.000Z",
  "updated_at": "2026-11-04T10:00:00.000Z",
  "completed_at": null
}
```

### 5.4 Cola offline

```typescript
type SyncOperation =
  | { type: "upsert"; task: Task }
  | { type: "delete"; id: string }
  | { type: "replace"; tasks: Task[] };
```

- `enqueueUpsert` y `enqueueDelete` sustituyen operaciones previas de la misma tarea.
- `flushSyncQueue` procesa en orden y conserva el resto si una operación falla.
- `replaceAllTasks` se usa al importar o cargar ejemplos.

---

## 6. Flujo de reconciliación

```text
[flushSyncQueue]
      ↓
[fetchRemoteTasks]
      ↓
[reconcileTasks(local, remote)]
      ↓
[merged: gana updatedAt más reciente]
      ↓
[localOnly: se ofrece subirlas]
      ↓
[localNewer: se reenvían a Supabase]
```

Las tareas solo remotas se incorporan directamente. Las solo locales no se suben
automáticamente: el usuario decide mediante el diálogo de sincronización.

---

## 7. Diagrama

```text
┌─────────────────────────────────────────────────────────────┐
│                        TABLA TASKS                          │
├─────────────────────────────────────────────────────────────┤
│  id             UUID        PK, gen_random_uuid()           │
│  title          TEXT        NOT NULL                        │
│  description    TEXT        NULL                            │
│  status         TEXT        CHECK + DEFAULT 'todo'          │
│  priority       TEXT        CHECK + DEFAULT 'low'           │
│  due_date       DATE        NULL                            │
│  tags           TEXT[]      NOT NULL DEFAULT '{}'           │
│  "order"        INTEGER     NOT NULL DEFAULT 0              │
│  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()          │
│  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()          │
│  completed_at   TIMESTAMPTZ NULL                            │
│  owner_id       UUID        NULL, futuro auth               │
├─────────────────────────────────────────────────────────────┤
│  RLS: políticas públicas de MVP                             │
│  GRANT: anon, authenticated                                 │
│  REALTIME: publicación supabase_realtime                    │
│  ÍNDICES: status, order, due_date, (status, order)          │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Verificación del modelo

- [x] Tipos de TypeScript mapeados a PostgreSQL.
- [x] CHECK para `status`, `priority` y `due_date`.
- [x] Índices para consultas frecuentes.
- [x] Trigger `updated_at` activo.
- [x] Migración probada y reproducible.
- [x] RLS y permisos configurados.
- [x] Publicación Realtime activa.
- [x] REST y Realtime probados contra el proyecto real.
