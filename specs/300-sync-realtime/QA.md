# QA: Sincronización en tiempo real y multi-dispositivo

**Código**: 300-sync-realtime | **Fecha**: 2026-11-09 | **Actualizado**: 2026-11-11
**Proyecto Supabase**: `tfjbkvxxdglxujnrcaeb`
**Entorno**: local (`pnpm`), API y Realtime reales contra Supabase; producción en
Vercel.

---

## 1. Alcance y método

1. **Automatizado**: lint, typegen, tipos, Vitest, build y CI.
2. **Base de datos**: esquema, RLS, índices, publicación y advisors.
3. **API**: sesión, correo verificado, mismo origen y CRUD.
4. **Realtime**: canal autenticado y aislamiento por `sub`.
5. **Manual**: interacción en navegador y dos dispositivos.

> La QA inicial de la versión 1.x probaba INSERT/UPDATE/DELETE con la `anon key`.
> Esa vía ya no existe: los permisos de escritura fueron revocados y el CRUD pasa
> por `/api/tasks`. Los resultados siguientes corresponden a la arquitectura
> actual.

---

## 2. Puertas de calidad

| Comando | Resultado |
|---------|-----------|
| `pnpm lint` | ✅ Sin errores ni warnings |
| `pnpm exec next typegen` | ✅ Tipos generados |
| `pnpm exec tsc --noEmit` | ✅ Sin errores |
| `pnpm test` | ✅ 46 pruebas en 6 archivos |
| `pnpm build` | ✅ Build de producción correcto |
| CI `.github/workflows/ci.yml` | ✅ Mismas cinco puertas |

Build de Next.js 16.4.3 con Turbopack. Todas las rutas se renderizan por petición
(`ƒ`) porque la CSP necesita un nonce por request; es el comportamiento esperado.

### 2.1 Hallazgo corregido por las pruebas

`moveTaskToColumn` renumeraba la columna de origen usando las posiciones de la
lista original, incluyendo la tarea que se estaba moviendo. Al mover la primera
tarea de una columna, la siguiente conservaba `order = 1` en lugar de `0`. Vitest
lo detectó y se corrigió el filtro de la renumeración.

---

## 3. Esquema de base de datos

Verificado en el proyecto real:

- [x] `public.tasks` con `id`, `title`, `description`, `status`, `priority`,
  `due_date`, `tags`, `order`, `created_at`, `updated_at`, `completed_at`,
  `owner_id` y `board_id`.
- [x] `owner_id` es `text NOT NULL` con FK a `public."user"(id)`.
- [x] `description` nullable, `tags` `NOT NULL DEFAULT '{}'` y `order` integer.
- [x] CHECK de `status`, `priority` y `due_date`.
- [x] Índices `idx_tasks_owner_status_order`, `idx_tasks_owner_created_at`,
  `idx_tasks_board_id` e `idx_board_owner_id`.
- [x] Trigger `update_tasks_updated_at` con `search_path = ''`.
- [x] RLS activo en `tasks` y en las tablas de Better Auth.
- [x] `replica identity full` en `tasks`.
- [x] `tasks` en `pg_publication_tables` de `supabase_realtime`.
- [x] `auth_rate_limit` con RLS y sin grants públicos.
- [x] Migraciones locales con las mismas versiones que el historial remoto.

### 3.1 Reproducibilidad

- [x] `20261109151132` → `20261112040000` aplican en orden desde un proyecto
  vacío.
- [x] Las migraciones históricas que faltaban se añadieron con la versión remota.
- [x] `owner_id` se verificó sin filas nulas antes de aplicar `SET NOT NULL`.

### 3.2 Advisors de Supabase

- [x] `auth_rls_initplan`: resuelto con `(select auth.jwt())`.
- [x] `function_search_path_mutable`: resuelto con `search_path = ''`.
- [x] `rls_enabled_no_policy` en tablas de servidor: intencionado (sin grants).
- [x] `unindexed_foreign_keys` de `board`: resuelto con `idx_board_owner_id`.
- [x] `unused_index` en `board`: esperado mientras la tabla esté vacía.

---

## 4. API de tareas

| Caso | Resultado |
|------|-----------|
| `GET /api/tasks` sin sesión | ✅ `401` JSON |
| `GET /api/tasks` sin correo verificado | ✅ `403` JSON |
| `POST`/`DELETE` desde otro origen | ✅ `403` |
| `POST` con lote > 500 | ✅ Se recorta y se informa `rejected` |
| `POST` con tarea inválida | ✅ Se descarta; no rompe el lote |
| `GET` con sesión | ✅ Solo tareas del `owner_id` de la sesión |
| `DELETE` con IDs ajenos | ✅ No borra filas de otra cuenta |
| Respuestas | ✅ `Cache-Control: no-store` |
| Cuerpo enorme | ✅ `413` antes de parsear |

El repositorio usa SQL parametrizado; un `id` con formato inválido se rechaza con
Zod antes de llegar a la consulta.

---

## 5. Realtime (WebSocket)

| Evento | Recibido | Detalle |
|--------|----------|---------|
| INSERT | ✅ | `id` de la tarea creada |
| UPDATE | ✅ | `id` y nuevo `title` |
| DELETE | ✅ | `id` de la tarea eliminada, con dueño por `REPLICA IDENTITY FULL` |

- [x] El canal se autentica con el JWT de `/api/realtime/token`.
- [x] La policy solo devuelve filas cuyo `owner_id` coincide con `sub`.
- [x] Un JWT inválido o ausente no recibe eventos.
- [x] El canal renueva el token antes de los 15 minutos.
- [x] Al suscribirse se hace una carga por API para cubrir la carrera inicial.

### 5.1 Aislamiento verificado

Con `request.jwt.claims` simulado para dos usuarios distintos, la policy devuelve
solo las filas del `sub` correspondiente. La cuenta B no recibe ni puede leer las
tareas de A.

### 5.2 Carrera al conectar

Insertar justo en el callback `SUBSCRIBED` puede perder el evento porque la
conexión de replicación tarda un instante en arrancar. La app no depende de ese
evento: hace una carga por API al suscribirse y luego escucha cambios.

---

## 6. QA visual manual

Ejecutado el 11/11/2026 con dos dispositivos sobre el deployment de producción:

- [x] Registro, OTP por correo y verificación.
- [x] Inicio de sesión con la misma cuenta en dos ventanas.
- [x] Crear, editar, mover y borrar tareas: los cambios llegan por WebSocket.
- [x] Escrituras correctas con Realtime deshabilitado (sondeo cada 30 s).
- [x] Registro y reenvío sin revelar si un correo existe.
- [x] Aislamiento entre cuentas.
- [x] Cabeceras de seguridad y CSP sin bloquear reCAPTCHA ni el WebSocket.
- [x] Drag & drop con ratón, táctil y teclado; anuncios ARIA y «Mover a».
- [x] Temas claro, oscuro y sistema; responsive en móvil, tableta y escritorio.
- [x] Consola del navegador sin errores.

---

## 7. Seguridad

- [x] `anon` no puede leer ni escribir `tasks`.
- [x] `authenticated` solo tiene `SELECT` propio; escrituras revocadas.
- [x] `/api/tasks` exige sesión, correo verificado y mismo origen.
- [x] `owner_id` nunca se acepta desde el cuerpo.
- [x] CSP con nonce por petición y `wss://*.supabase.co` permitido.
- [x] HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy` y
  `Permissions-Policy`.
- [x] Sin secretos en el bundle del cliente.

---

## 8. Despliegue en Vercel

| Comprobación | Resultado |
|--------------|-----------|
| Deployment de `master` | ✅ `READY` |
| URL de producción | ✅ <https://hometable.luuiscastro.me> |
| Alias de Vercel | ✅ <https://hometable-tasks.vercel.app> |
| `/` sin sesión | ✅ `307` a `/login` |
| `/api/tasks` sin sesión | ✅ `401` |
| `/api/realtime/token` sin sesión | ✅ `401` |
| Cabeceras de seguridad | ✅ Presentes |
| Errores de runtime | ✅ Sin errores |

---

## 9. Conclusión

La base de datos, la API, Realtime, el aislamiento por cuenta, las pruebas
unitarias, la CI y el despliegue están validados. Las puertas automatizadas están
en verde y el QA manual con dos dispositivos se completó sin incidencias.
