# Especificación: Sincronización en tiempo real y multi-dispositivo

**Código**: 300-sync-realtime | **Autor**: Equipo de desarrollo | **Fecha**: 2026-11-04
| **Actualizado**: 2026-11-11 | **Estado**: Implementado y en producción

---

## 1. Resumen

Hometable mantiene el tablero sincronizado entre los dispositivos de **una misma
cuenta**. PostgreSQL es la única fuente de verdad: el navegador lee y escribe a
través de `/api/tasks`, que valida la sesión de Better Auth y deriva el dueño. Los
demás dispositivos reciben los cambios por **Supabase Realtime** mediante un JWT
corto y RLS; si el WebSocket no está disponible, un sondeo cada 30 segundos
mantiene el tablero al día.

> **Historia**: la versión 1.x de esta especificación describía una SPA con
> `localStorage`, cola offline y reconciliación local/remoto. Esa arquitectura fue
> sustituida en la versión 2.0 por el servidor como fuente única de verdad. Los
> documentos de este directorio describen el estado real desde entonces.

---

## 2. Contexto actual

- **Arquitectura**: aplicación full-stack con Next.js 16 App Router desplegada en
  Vercel.
- **Persistencia**: PostgreSQL en Supabase, accedido desde el servidor con `pg` y
  sentencias parametrizadas. No hay tareas en `localStorage`.
- **Autenticación**: obligatoria con Better Auth, correo verificado y registro
  diferido hasta confirmar el OTP.
- **Sincronización**: Realtime autenticado para lectura de las tareas propias y
  sondeo de respaldo.
- **Stack**: Next.js 16, React 19, TypeScript 5, Zustand 5 (sin `persist`),
  Tailwind CSS 4, Vitest 3.

---

## 3. Objetivo del Spec

Definir la integración de Supabase para:

1. **Base de datos**: persistir `Task` en la tabla PostgreSQL `tasks`, con
   `owner_id` obligatorio.
2. **API**: exponer `GET`, `POST` y `DELETE /api/tasks` con sesión, mismo origen y
   SQL parametrizado.
3. **Realtime**: entregar INSERT/UPDATE/DELETE de las tareas propias por WebSocket,
   sin conceder escrituras ni acceso a otras cuentas.
4. **Respaldo**: mantener el tablero al día con sondeo cuando Realtime no está
   disponible.
5. **Reproducibilidad**: versionar el esquema, RLS, índices y publicación en
   `supabase/migrations/` en el mismo orden que el historial remoto.

---

## 4. Supuestos

### 4.1 Base de datos

**Elección definitiva**: **Supabase** (PostgreSQL + Realtime).

| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| PostgreSQL nativo en Vercel | Integración nativa | No ofrece WebSocket persistente | ❌ Rechazada |
| Firebase | Sencillo | Modelo NoSQL y límites bajos | ❌ Rechazada |
| Supabase | PostgreSQL, RLS y Realtime | Requiere configurar RLS y JWT | ✅ Elegida |

### 4.2 Variables de entorno

Públicas (llegan al navegador):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-public-key]
```

Solo servidor:

```bash
DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres
SUPABASE_JWT_SECRET=[jwt-secret-del-proyecto]
```

No se usa `SUPABASE_SERVICE_ROLE_KEY` en la aplicación. La `anon key` es pública
por diseño; el acceso real lo limitan la sesión, la API y RLS.

### 4.3 Transición desde la versión local

No hay migración automática de `taskboard:*`. Una persona que venía de la versión
local debe crear una cuenta y volver a introducir sus tareas. Esta decisión se
documentó en la enmienda constitucional v3.0.0.

---

## 5. Modelo de datos

### 5.1 Tabla `tasks`

Fuente de verdad: conjunto ordenado de `supabase/migrations/`. El estado final:

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
```

Características adicionales:

- `owner_id` es `text` porque referencia `public."user"(id)` de Better Auth, no
  `auth.users`.
- `replica identity full` para que los eventos DELETE incluyan el dueño.
- Índices `(owner_id, status, "order")` y `(owner_id, created_at desc)`, más
  `idx_tasks_board_id` para el futuro multi-tablero.
- Trigger `update_tasks_updated_at` con `search_path = ''` y `pg_catalog.now()`.
- RLS activo. `authenticated` solo tiene `SELECT` de las filas propias; `anon` no
  tiene ningún privilegio.

### 5.2 Mapeo de campos (Task ↔ Supabase)

| Task (app) | Supabase (DB) | Comentario |
|------------|---------------|------------|
| `id: string` | `id: uuid` | UUID generado en el cliente |
| `title: string` | `title: text` | Máx. 120 caracteres |
| `description?: string` | `description: text` | Nullable |
| `status: TaskStatus` | `status: text` | CHECK de dominio |
| `priority: TaskPriority` | `priority: text` | CHECK de dominio |
| `dueDate?: string` | `due_date: date` | `yyyy-MM-dd`, sin hora |
| `tags: string[]` | `tags: text[]` | Default `{}` |
| `order: number` | `"order": integer` | Posición en la columna |
| `createdAt: string` | `created_at: timestamptz` | Enviado por el cliente |
| `updatedAt: string` | `updated_at: timestamptz` | Trigger en UPDATE |
| `completedAt?: string` | `completed_at: timestamptz` | Nullable |
| `ownerId?: string` | `owner_id: text` | Lo fuerza el servidor |

El mapeo vive en `src/lib/task-mapper.ts` y los tipos en
`src/lib/types/supabase.ts`.

---

## 6. Arquitectura de sincronización

### 6.1 Escritura

```text
[UI: formulario / drag & drop]
        ↓
[Zustand actualiza el estado de forma optimista]
        ↓
[POST /api/tasks (upsert) o DELETE /api/tasks]
        ↓
[requireSameOrigin + getSession + emailVerified]
        ↓
[tasks-repo.ts: SQL parametrizado con owner_id de la sesión]
        ↓
[PostgreSQL]
        ↓
[Supabase Realtime emite el cambio]
        ↓
[Otros dispositivos actualizan Zustand]
```

- El cuerpo de escritura usa `readJsonBody` con límite de 1 MiB.
- El servidor valida cada tarea con Zod y descarta las inválidas; devuelve
  `{ accepted, rejected }`.
- El máximo por petición es de 500 tareas.
- Si una escritura falla, el hook muestra un aviso y recarga el tablero desde el
  servidor. No hay cola de reintentos.
- Un `401` cierra la sesión y redirige a `/login`.

### 6.2 Lectura e inicialización

```text
[App arranca con sesión verificada]
        ↓
[GET /api/tasks]
        ↓
[rowToTask en el servidor]
        ↓
[replaceFromServer en Zustand]
        ↓
[useTasksRealtime pide /api/realtime/token y se suscribe]
        ↓
[Sondeo cada 30 s + foco + reconexión como respaldo]
```

### 6.3 Conflictos

No hay reconciliación local/remoto. PostgreSQL es la copia autoritativa y cada
lectura reemplaza el estado en memoria. Si dos dispositivos escriben la misma
tarea, gana la última escritura que llega al servidor; el resto de clientes
reciben el `UPDATE` por Realtime o lo ven en el siguiente sondeo.

---

## 7. Cambios en el stack

### 7.1 Dependencias

```bash
pnpm add @supabase/supabase-js   # solo Realtime
pnpm add -D vitest               # pruebas unitarias
```

### 7.2 Archivos relevantes

```text
src/
├── proxy.ts                       # protección de rutas + CSP con nonce
├── app/
│   ├── page.tsx                   # guard de sesión y correo verificado
│   └── api/
│       ├── tasks/route.ts         # GET/POST/DELETE autenticados
│       └── realtime/token/route.ts# JWT HS256 de 15 min
├── hooks/
│   ├── use-tasks-sync.ts          # carga, sondeo, foco/online y 401
│   ├── use-tasks-realtime.ts      # canal autenticado y mapeo de eventos
│   └── use-redirect-if-authenticated.ts
├── lib/
│   ├── db.ts                      # pool único y TLS de Supabase
│   ├── task-mapper.ts             # fila de Postgres → Task
│   ├── tasks-repo.ts              # SQL parametrizado
│   ├── tasks-sync.ts              # cliente de /api/tasks
│   ├── realtime-token.ts          # firma del JWT
│   └── supabase-client.ts         # cliente nullable solo para Realtime
└── store/task-store.ts            # estado en memoria
supabase/migrations/               # esquema, RLS, índices, rate limit y Realtime
tests/                             # Vitest
```

### 7.3 Store

El store expone `replaceFromServer` y mutaciones optimistas (`addTask`,
`updateTask`, `deleteTask`, `moveTask`, etc.). No persiste tareas, no conoce
Supabase y no se suscribe a nada: los efectos viven en los hooks.

---

## 8. UX / Interacción

| Estado | Indicador |
|--------|-----------|
| Cargando | Esqueleto del tablero |
| Conectado | Badge «Sincronizado» con hora de última sincronización |
| Sin conexión | Badge «Sin conexión» |
| Error | Badge rojo con tooltip y reintento |
| Realtime no disponible | El badge sigue funcionando con el sondeo |

El estado de sincronización es informativo; nunca bloquea la edición.

---

## 9. Seguridad

- **API**: sesión obligatoria, correo verificado, mismo origen y SQL parametrizado.
- **RLS**: `tasks` activo; `authenticated` solo lee filas cuyo `owner_id` coincide
  con `auth.jwt() ->> 'sub'` (evaluado en subconsulta).
- **Realtime**: JWT de 15 minutos firmado en el servidor con
  `SUPABASE_JWT_SECRET`. Sin token válido el canal no recibe eventos.
- **Escrituras**: revocadas para `anon` y `authenticated`; el CRUD pasa por
  `/api/tasks`.
- **Cabeceras**: CSP con nonce por petición (permite `wss://*.supabase.co`),
  `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS en
  producción y `poweredByHeader: false`.
- `.env.local` está ignorado por git; `.env.example` documenta cada variable.

---

## 10. Migraciones y reproducibilidad

Las migraciones locales están ordenadas con las mismas versiones que el historial
remoto de Supabase:

| Versión | Contenido |
|---------|-----------|
| `20261109151132_align_tasks_schema_and_realtime` | Tabla `tasks`, trigger, índices y publicación. |
| `20261109151500_better_auth_tables` | `user`, `session`, `account`, `verification`, `board` y `owner_id`. |
| `20261109152043_grant_tasks_api_privileges` | Grants históricos de PostgREST. |
| `20261109152450_make_tasks_migration_reproducible` | Guardas idempotentes del esquema. |
| `20261110161929_enable_rls_auth_tables` | RLS en las tablas de Better Auth. |
| `20261110171312_lock_down_tasks` | Revocación de grants y RLS de tareas. |
| `20261110200442_pending_registrations` | Registro pendiente de verificación. |
| `20261111161842_realtime_owner_read` | Lectura Realtime por dueño. |
| `20261111162025_auth_rate_limit` | Contadores de rate limit. |
| `20261111162255_tasks_owner_indexes` | Índices por dueño. |
| `20261111174752_harden_policy_and_function` | Subconsulta de `auth.jwt()` y `search_path`. |
| `20261111174801_harden_realtime_policy_jwt_subquery` | Misma policy, idempotente. |
| `20261112040000_tasks_owner_not_null_and_board_index` | `owner_id NOT NULL` e índice de `board`. |

No se aplican migraciones nuevas desde el panel sin crear antes el archivo local
correspondiente: eso reintroduciría divergencia entre el repositorio y el proyecto.

---

## 11. Casos de uso

### CU-001: Crear tarea en tiempo real

1. El formulario valida con Zod y llama a `addTask()`.
2. Zustand añade la tarea de forma optimista.
3. `pushTasks()` hace `POST /api/tasks`.
4. El servidor valida, fuerza `owner_id` y hace `upsert`.
5. Realtime emite `INSERT`; los demás dispositivos actualizan la tarjeta.

### CU-002: Mover tarea (drag & drop)

1. `moveTask()` actualiza `status` y `order` de forma optimista.
2. El diff se envía a `/api/tasks`.
3. Realtime emite `UPDATE`; los demás dispositivos actualizan la tarjeta.

### CU-003: Realtime no disponible

1. El canal falla, falta `SUPABASE_JWT_SECRET` o el WebSocket se cae.
2. La UI sigue funcionando; el sondeo cada 30 s, el foco y la reconexión
   actualizan el tablero.
3. Al volver el WebSocket, el hook vuelve a pedir token y resincroniza.

### CU-004: Sesión caducada

1. Una escritura responde `401`.
2. El hook cierra la sesión y redirige a `/login`.
3. No se muestran datos obsoletos como si fueran propios.

---

## 12. Criterios de aceptación

### CA-001: Base de datos

- [x] Tabla `tasks` con `owner_id NOT NULL` y FK a `public."user"`.
- [x] Índices por dueño, estado y orden.
- [x] Trigger `updated_at` con `search_path` fijo.
- [x] RLS, privilegios y publicación Realtime configurados.
- [x] Migraciones ordenadas y reproducibles desde un proyecto vacío.

### CA-002: Cliente Supabase

- [x] Cliente singleton nullable, usado solo para Realtime.
- [x] Variables documentadas y configuradas en Vercel.
- [x] Sin variables, el tablero sigue funcionando con sondeo.

### CA-003: Sincronización

- [x] `GET`, `POST` y `DELETE /api/tasks` funcionan con sesión.
- [x] Las escrituras sin sesión, sin correo verificado o desde otro origen se
  rechazan.
- [x] Realtime entrega INSERT, UPDATE y DELETE de la cuenta propia.
- [x] RLS impide recibir eventos de otras cuentas.
- [x] El sondeo mantiene el tablero al día si Realtime falla.
- [x] Drag & drop sincroniza `status` y `order`.
- [x] No existe cola offline ni reconciliación local/remoto.

### CA-004: Verificación

- [x] `pnpm lint`, `next typegen`, `tsc --noEmit`, `pnpm test` y `pnpm build` en
  verde.
- [x] QA manual con dos dispositivos el 11/11/2026.
- [x] CI configurada en `.github/workflows/ci.yml`.

---

## 13. Enmienda constitucional

**Artículo VI (v3.0.0)**:

> PostgreSQL es la única fuente de verdad. Realtime se mantiene como función
> secundaria para la misma cuenta en varios dispositivos, autenticado con un JWT
> corto y limitado por RLS a la lectura de las tareas propias.

---

**Versión**: 2.0.0 | **Estado**: Implementado y verificado en producción
