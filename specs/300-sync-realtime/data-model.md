# Data Model: Sincronización en tiempo real y multi-dispositivo

**Código**: 300-sync-realtime | **Fecha**: 2026-11-04 | **Actualizado**: 2026-11-11

---

## 1. Modelo de dominio

La interfaz `Task` vive en `src/lib/types.ts`:

```typescript
export interface Task {
  id: string;             // UUID generado en el cliente
  title: string;          // Máx. 120 caracteres
  description?: string;   // Máx. 1000 caracteres
  status: TaskStatus;     // 'todo' | 'in_progress' | 'done'
  priority: TaskPriority; // 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string;       // yyyy-MM-dd, sin hora ni zona horaria
  tags: string[];         // Máx. 8 etiquetas de 24 caracteres
  order: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  ownerId?: string;       // Lo fuerza el servidor desde la sesión
}
```

`TaskStatus` y `TaskPriority` se derivan de `TASK_STATUSES` y `TASK_PRIORITIES`,
que también alimentan los CHECK de PostgreSQL y los esquemas Zod.

---

## 2. Modelo de datos en Supabase

### 2.1 Esquema final

Fuente de verdad: conjunto ordenado de `supabase/migrations/`.

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
  owner_id text not null references public."user"(id) on delete cascade,
  board_id uuid references public.board(id) on delete cascade
);

create index idx_tasks_owner_status_order
  on public.tasks (owner_id, status, "order");
create index idx_tasks_owner_created_at
  on public.tasks (owner_id, created_at desc);
create index idx_tasks_board_id on public.tasks (board_id);
```

Características adicionales:

- `replica identity full` para que los DELETE incluyan `owner_id`.
- Trigger `update_tasks_updated_at` con `search_path = ''` y `pg_catalog.now()`.
- RLS activo; `authenticated` solo tiene `SELECT` de las filas propias.
- `tasks` incluida en la publicación `supabase_realtime`.
- `board` reservada para el futuro multi-tablero (máximo 2 por usuario).

### 2.2 Mapeo detallado

| Task (app) | Supabase (DB) | Tipo SQL | Nullable | Default | Comentario |
|------------|---------------|----------|----------|---------|------------|
| `id` | `id` | UUID | NO | `gen_random_uuid()` | UUID del cliente |
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
| `ownerId` | `owner_id` | TEXT | NO | - | FK a `public."user"` |
| — | `board_id` | UUID | SÍ | NULL | FK a `public.board` |

El mapeo TypeScript está en `src/lib/task-mapper.ts`; los tipos de la fila, en
`src/lib/types/supabase.ts`.

### 2.3 Fechas de solo día

El driver `pg` devuelve `date` como texto. Aun así, `rowToTask` normaliza cualquier
valor:

- un `Date` se convierte con `toDateOnly` (hora local);
- un texto `YYYY-MM-DD...` se recorta a los 10 primeros caracteres;
- cualquier otro valor se descarta.

Así el tablero no pierde la fecha al recargar ni al recibir un evento de Realtime.

---

## 3. Trigger de `updated_at`

```sql
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create trigger update_tasks_updated_at
  before update on public.tasks
  for each row
  execute function public.update_updated_at_column();
```

`search_path = ''` y `pg_catalog.now()` eliminan el aviso
`function_search_path_mutable` de los advisors de Supabase.

### 3.1 Reordenamiento

No hay RPC `reorder_tasks`. El cliente reordena y el diff se envía a
`POST /api/tasks`; el servidor hace `upsert` de las tareas cuyo `order` o `status`
cambió. Es suficiente para el tamaño del tablero y evita duplicar lógica en la base
de datos.

---

## 4. Row Level Security (RLS)

### 4.1 Estado real

```sql
alter table public.tasks enable row level security;
alter table public.tasks replica identity full;

revoke all on table public.tasks from anon, public;
revoke insert, update, delete on table public.tasks from authenticated;
grant select on table public.tasks to authenticated;

create policy "realtime select own tasks"
  on public.tasks
  for select
  to authenticated
  using (owner_id = ((select auth.jwt()) ->> 'sub'));
```

- `anon` no puede leer ni escribir.
- `authenticated` solo lee sus filas; las escrituras pasan por `/api/tasks`, que usa
  la conexión directa a Postgres y la sesión de Better Auth.
- `auth.jwt()` se evalúa en una subconsulta para que el planner la inicialice una
  vez por sentencia (`auth_rls_initplan`).

### 4.2 Tablas de Better Auth

`public."user"`, `session`, `account`, `verification`, `pending_registration`,
`auth_rate_limit` y `board` tienen RLS activo y ningún grant para `anon` o
`authenticated`. Solo el servidor accede a ellas con `DATABASE_URL`.

---

## 5. Persistencia en el navegador

| Clave | Uso |
|-------|-----|
| `theme` (next-themes) | Única preferencia persistida: claro, oscuro o sistema. |

No existen `taskboard:v1`, `taskboard:v2` ni `taskboard:sync-queue`. El estado de
las tareas vive en memoria y se reemplaza con la respuesta de `/api/tasks` y con
los eventos de Realtime.

---

## 6. Flujo de datos

```text
[GET /api/tasks]
      ↓
[listTasks(userId)] → SQL parametrizado
      ↓
[rowToTask] → Task[]
      ↓
[replaceFromServer] → Zustand
      ↓
[useTasksRealtime] → token + canal → eventos propios
      ↓
[upsertTaskFromRealtime] → Zustand
```

Las escrituras siguen el camino inverso:

```text
[mutación optimista en Zustand]
      ↓
[pushTasks / deleteTasks]
      ↓
[POST o DELETE /api/tasks]
      ↓
[Zod + owner_id de la sesión + SQL parametrizado]
      ↓
[PostgreSQL] → Realtime → resto de dispositivos
```

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
│  owner_id       TEXT        NOT NULL → public."user"        │
│  board_id       UUID        NULL → public.board             │
├─────────────────────────────────────────────────────────────┤
│  RLS: SELECT propio por auth.jwt() ->> 'sub'                │
│  Escrituras: solo servidor (/api/tasks)                     │
│  REALTIME: publicación supabase_realtime + REPLICA FULL     │
│  ÍNDICES: (owner_id,status,order), (owner_id,created_at)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Verificación del modelo

- [x] Tipos de TypeScript mapeados a PostgreSQL.
- [x] CHECK para `status`, `priority` y `due_date`.
- [x] Índices alineados con las consultas reales.
- [x] Trigger `updated_at` con `search_path` fijo.
- [x] Migraciones ordenadas y reproducibles.
- [x] RLS y privilegios configurados.
- [x] Publicación Realtime activa y policy validada con `request.jwt.claims`.
- [x] `rowToTask` cubierto por Vitest (fechas, estado inválido y etiquetas).
