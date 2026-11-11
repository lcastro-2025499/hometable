# Progreso: modernización de Hometable

**Sesión:** migración a servidor como fuente única de verdad, Realtime
autenticado y endurecimiento de seguridad.

**Estado:** implementación terminada, desplegada en producción y QA manual
verificado con dos dispositivos el 11/11/2026. `master` está sincronizado con
`origin` y desplegable en Vercel.

## Objetivo

- Dejar Realtime funcionando para la misma cuenta en varios dispositivos.
- Eliminar por completo el almacenamiento local de tareas, la cola offline, la
  reconciliación local/remoto, los datos de ejemplo y la importación/exportación.
- Corregir las vulnerabilidades P0/P1 detectadas en autenticación y API.
- Actualizar la documentación y mantener commits pequeños.

## Completado

### Tareas y sincronización

- [x] `task-store.ts` sin `persist`: estado en memoria y mutaciones optimistas.
- [x] `replaceFromServer` reemplaza el tablero con la copia autoritativa.
- [x] `tasks-sync.ts` sin cola offline: solo `fetchRemoteTasks`, `pushTasks`,
  `deleteTasks` y notificación de fallos.
- [x] `use-tasks-sync.ts`: carga inicial, sondeo cada 30 s, refresco en
  `online`/`focus` y recarga completa si falla una escritura.
- [x] `TaskBoard` sin `useHydrated` para tareas, sin listener de `storage` y sin
  datos de ejemplo; esqueleto mientras carga.
- [x] Eliminados `sync-queue.ts`, `task-sync.ts`, `storage-migration.ts` y
  `seed.ts`.
- [x] `tasks-repo.ts` con límites compartidos, fechas reales, conteo real de
  filas aceptadas y sin `replaceTasks` ni `PUT` destructivo.
- [x] `taskToRow`/`TaskInsert` eliminados: el navegador ya no escribe filas.

### Realtime

- [x] `/api/realtime/token` firma un JWT HS256 de 15 minutos con `sub`,
  `role=authenticated` y `aud=authenticated` usando `SUPABASE_JWT_SECRET`.
- [x] Cliente de Supabase perezoso y nullable; si faltan variables, se usa solo
  el sondeo.
- [x] Canal autenticado con `setAuth`, filtro `owner_id=eq.<userId>`, mapeo de
  payloads con `rowToTask`, guardas de id, reintento y resincronización.
- [x] Migración `realtime_owner_read`: `REPLICA IDENTITY FULL`, policy de
  `SELECT` por `auth.jwt() ->> 'sub'`, `GRANT SELECT` a `authenticated` y alta en
  la publicación `supabase_realtime`.
- [x] Verificado en Supabase: `replica_identity=f`, policy activa,
  `authenticated:SELECT` y tabla publicada.

### Seguridad de autenticación

- [x] Rate limit persistente en `public.auth_rate_limit` (registro,
  verificación y reenvío).
- [x] Verificación de mismo origen en las rutas de escritura.
- [x] OTP vinculado al navegador con cookie `httpOnly` firmada por HMAC
  (`hometable_pending`).
- [x] Mensajes genéricos ante correo/usuario ocupado y reenvío genérico para
  evitar enumeración.
- [x] `BETTER_AUTH_SECRET` y `BETTER_AUTH_URL` obligatorios y sin valores por
  defecto; URL canónica y orígenes de confianza.
- [x] Eliminado el remitente sandbox de Resend y el fallback de secreto.
- [x] Eliminada la limpieza automática de usuarios sin verificar.
- [x] Registro: site key sin fallback, validación en vivo y botón deshabilitado
  hasta que el formulario es válido.

### Plataforma y rendimiento

- [x] `middleware.ts` migrado a `proxy.ts` (convención de Next.js 16), rutas
  públicas exactas y sin bypass por punto.
- [x] Cabeceras de seguridad: CSP con allowlist de reCAPTCHA y Supabase,
  `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS en
  producción y `poweredByHeader: false`.
- [x] `db.ts` prefiere `DATABASE_URL` (pooler), usa `DIRECT_URL` solo como
  respaldo y limita TLS a hosts de Supabase.
- [x] Índices `(owner_id, status, order)` y `(owner_id, created_at desc)`;
  retirados los índices globales obsoletos.
- [x] Dependencias de tipos y CLI movidas a `devDependencies`; Node 22 exigido.
- [x] `passwordSchema` y campo de correo compartidos en la validación.

### Documentación

- [x] `README.md` reescrito: arquitectura, flujo de datos, seguridad, variables,
  migraciones, scripts y alcance.
- [x] `.env.example` con una ficha por variable: pública/secreta, cliente o
  servidor, obligatoriedad y consecuencia de que falte.
- [x] `PROGRESS.md` reescrito desde cero para esta sesión.
- [x] Metadatos de la aplicación sin referencias al almacenamiento en el
  navegador.

## Verificación realizada

- [x] `pnpm exec tsc --noEmit` sin errores.
- [x] `pnpm lint` sin errores.
- [x] `pnpm build` correcto con Next.js 16.4.3.
- [x] Migraciones aplicadas en el proyecto Supabase conectado:
  `realtime_owner_read`, `auth_rate_limit` y `tasks_owner_indexes`.
- [x] Comprobación SQL del estado de Realtime y de los índices.
- [x] Migración `harden_policy_and_function`: policy de Realtime con
  `auth.jwt()` en subconsulta y trigger `update_updated_at_column` con
  `search_path = ''` y `pg_catalog.now()`.
- [x] Advisors de Supabase sin avisos `WARN`: sin `auth_rls_initplan` ni
  `function_search_path_mutable`.

### Despliegue y producción

- [x] `master` publicado en `origin`; Vercel desplegó `c443caa`
  (`dpl_5fAKtXtYCKSF97A8wvpJAupnbtMP`, READY) con los alias
  `hometable-tasks.vercel.app` y `hometable-tasks-git-master-deepsitos1.vercel.app`.
- [x] Variables en Vercel: `BETTER_AUTH_URL` y `SUPABASE_JWT_SECRET`
  (Production y Development; el secreto como `sensitive`), además de las ya
  existentes.
- [x] `SUPABASE_JWT_SECRET` local validado contra PostgREST (200 con el JWT
  firmado, 401 con un secreto inválido) y contra Realtime (`SUBSCRIBED`).
- [x] Smoke test con `curl` sobre producción: `/login` 200 con CSP, HSTS,
  `nosniff` y `X-Frame-Options`; `/` 307 a `/login` con las mismas cabeceras;
  `/api/tasks` y `/api/realtime/token` 401; `/api/auth/ok` 200.
- [x] `POST /api/auth/sign-in/email` con credenciales falsas responde 401
  `INVALID_EMAIL_OR_PASSWORD`: Better Auth consulta Postgres a través del
  pooler y descarta los antiguos `Connection terminated due to connection timeout`.
- [x] Sin errores de runtime en el deployment nuevo.
- [x] Policy verificada como `authenticated` con `request.jwt.claims`
  simulado: solo devuelve las filas del `sub`.

### Dominio propio

- [x] `hometable.luuiscastro.me` verificado en Vercel (CNAME a Vercel y TLS
  válido) y sirviendo producción.
- [x] `BETTER_AUTH_URL` = `https://hometable.luuiscastro.me` y
  `BETTER_AUTH_TRUSTED_ORIGINS` = `https://hometable-tasks.vercel.app`.
- [x] `resolveTrustedOrigins` acepta la lista extra sin cambiar el canónico;
  los enlaces de correo y las cookies siguen saliendo del dominio propio.
- [x] Ambos orígenes inician sesión (401 `INVALID_EMAIL_OR_PASSWORD` en vez de
  403 `INVALID_ORIGIN`) y un origen ajeno sigue rechazado con 403.
- [x] Dominio añadido a la allowlist de reCAPTCHA.

### Correcciones posteriores

- [x] Fechas límite: el driver devolvía las columnas `date` como `Date` y el
  JSON llegaba al navegador como `2026-11-28T06:00:00.000Z`, que la UI no podía
  interpretar; la fecha desaparecía al recargar o tras el sondeo de 30 s y la
  tarea se descartaba al reeditarla. El pool devuelve ahora `date` como texto
  `YYYY-MM-DD` y `rowToTask` normaliza cualquier valor que llegue.
- [x] Commit `29c827d` desplegado en producción.

## QA manual verificado

Ejecutado el 11/11/2026 con dos dispositivos sobre el deployment de producción:

1. [x] Registro, OTP por correo y verificación.
2. [x] Inicio de sesión con la misma cuenta en dos ventanas.
3. [x] Crear, editar, mover y borrar tareas: los cambios llegan por WebSocket.
4. [x] Escrituras correctas con Realtime deshabilitado (sondeo cada 30 s).
5. [x] Registro y reenvío sin revelar si un correo existe.
6. [x] Aislamiento entre cuentas: no se leen ni modifican tareas ajenas.
7. [x] Cabeceras de seguridad y CSP sin bloquear reCAPTCHA ni el WebSocket.

## Avisos de advisors

- `auth_rls_initplan` y `function_search_path_mutable`: resueltos en
  `20261112030000_harden_policy_and_function.sql`.
- `rls_enabled_no_policy` (7 tablas de auth y servidor): intencionado. RLS
  activo sin policies y sin grants equivale a denegar a `anon` y
  `authenticated`; el acceso es solo server-side por `DATABASE_URL`.
- `unindexed_foreign_keys` y `unused_index`: `public.board` está vacía y
  reservada para un futuro multi-tablero; los índices por dueño aún no tienen
  tráfico que los marque como usados.

## Límites conocidos

- Preview no tiene `BETTER_AUTH_URL`, así que un deployment de preview arranca
  pero falla en el primer request de autenticación.
- `NEXT_PUBLIC_APP_URL` sigue en Vercel sin uso en el código: pendiente de
  borrar a mano en el dashboard.

## Commits de la sesión

1. `f095a5f` refactor(tasks): make the server the single source of truth
2. `6c738fe` feat(realtime): issue scoped Supabase Realtime tokens
3. `4384a08` feat(db): grant read-only Realtime access to own tasks
4. `cafb7d2` fix(realtime): authenticate the channel and map payloads
5. `8dbc8fa` refactor(auth): migrate middleware to the proxy convention
6. `81a9982` feat(security): send CSP and hardening headers
7. `7ca7161` fix(db): prefer the pooled connection and scope TLS to Supabase
8. `ee3235d` perf(db): index tasks by owner and status
9. `17f0cc4` feat(auth): add rate limiting and request helpers
10. `3145bf3` fix(auth): harden registration, verification and email delivery
11. `77a133c` fix(realtime): drop the explicit Node runtime
12. `7444fb3` fix(auth): allow localhost during production builds
13. `06d2c5d` build(deps): move tooling types and CLI to devDependencies
14. `09261bf` refactor(auth): share the password validation schema
15. `3e8a20c` docs: document the server-first architecture and environment
16. `7a8de68` docs: rewrite the progress log for this session
17. `a2f4a97` docs: update agent rules for the server-first model
18. `82bf4cd` fix(ui): update the app description
19. `7299714` refactor(tasks): reuse the shared request helpers
20. `5c71676` docs: complete the session commit list
21. `c443caa` fix(realtime): retry when the token cannot be issued
22. `5acb9c7` fix(db): harden realtime policy and trigger search_path
23. `32f461d` feat(auth): accept extra trusted origins
24. `29c827d` fix(tasks): keep due dates as date-only strings
