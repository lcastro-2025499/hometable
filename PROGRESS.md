# Progreso: modernización de Hometable

**Sesión:** migración a servidor como fuente única de verdad, Realtime
autenticado, endurecimiento de seguridad y auditoría de reproducibilidad,
pruebas y CI.

**Estado:** implementación terminada, publicada en `origin/master` y desplegada
en producción; QA manual verificado con dos dispositivos el 11/11/2026. La
auditoría posterior dejó las migraciones reproducibles, 46 pruebas Vitest, CI y
el deployment `dpl_9ydsgmLkoXeDpV4owR2hMcFqBaQZ` en verde.

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
- [x] `db.ts` exige `DATABASE_URL` (pooler) en producción, sin caer a
  `DIRECT_URL`; en local acepta la conexión directa y usa
  `SUPABASE_DB_CA_CERT` para validar TLS cuando está definida.
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
- [x] `pnpm test`: 46 pruebas en 6 archivos, todas en verde.
- [x] `pnpm build` verificado sin `.env.local`, con las mismas variables
  ficticias que CI.
- [x] CI ejecuta las cinco puertas automatizadas en cada push y pull request.

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

### Despliegue de la auditoría (12/11/2026)

- [x] `master` publicado en `origin`: `243f748..b26c48e` y después
  `b26c48e..1b7f349`.
- [x] Primer deployment (`dpl_scqqFUwr7i4njvetnXS6refgcSJV`) falló en
  `pnpm install` con `ERR_PNPM_IGNORED_BUILDS` por el postinstall de `esbuild`.
- [x] Corregido con `allowBuilds.esbuild: true` y Node `22.x`; CI de GitHub
  Actions en verde (`43121416108`, 56 s).
- [x] Deployment `dpl_9ydsgmLkoXeDpV4owR2hMcFqBaQZ` (`1b7f349`) en `READY`,
  sirviendo `hometable.luuiscastro.me` y los alias de Vercel.
- [x] `GET /` → `307` a `/login`; `/login` y `/register` → `200`.
- [x] CSP con nonce distinto por petición, `strict-dynamic`, reCAPTCHA y
  `wss://*.supabase.co`; HSTS, `nosniff` y `X-Frame-Options` presentes.
- [x] `/api/tasks` y `/api/realtime/token` → `401` sin sesión.
- [x] `/api/auth/sign-up/email` → `400 EMAIL_PASSWORD_SIGN_UP_DISABLED`.
- [x] Login con credenciales falsas → `401 INVALID_EMAIL_OR_PASSWORD`, lo que
  confirma la conexión a Postgres a través del pooler.
- [x] Sin errores de runtime en la ventana consultada.

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

### Auditoría de reproducibilidad, pruebas y seguridad (12/11/2026)

- [x] Migraciones locales renombradas a las versiones del historial remoto de
  Supabase; añadidos los archivos históricos que faltaban
  (`20261109152043`, `20261109152450`, `20261110161929`,
  `20261111174801` y `20261112040000`).
- [x] `tasks.owner_id` pasó a `NOT NULL` (0 filas nulas comprobadas antes) y se
  creó `idx_board_owner_id`.
- [x] `readJsonBody` lee por streaming y aplica un límite real de bytes aunque
  falte `Content-Length`; las rutas de autenticación usan 16 KiB.
- [x] `clientIp` prioriza `x-real-ip`, que Vercel sobrescribe, para que el
  cliente no pueda rotar la clave del rate limit.
- [x] `disableSignUp: true`: el único alta es `/api/auth/register` con
  reCAPTCHA + OTP.
- [x] Rate limit de Better Auth persistido en `public.auth_rate_limit` mediante
  `consumeRateLimit` como `customStorage`, compartido entre instancias.
- [x] Validación de esquema de Better Auth desactivada durante `next build`
  (`NEXT_PHASE === "phase-production-build"`), activa en ejecución.
- [x] CSP con nonce por petición en `src/proxy.ts`; retirada de
  `next.config.ts`. El layout lee el nonce con `headers()` y todas las rutas se
  renderizan por petición (`export const instant = false`).
- [x] Eliminada la redirección de rutas públicas basada solo en la cookie;
  `useRedirectIfAuthenticated` espera la sesión real y evita bucles con cookies
  caducadas.
- [x] Un `401` de `/api/tasks` cierra la sesión y redirige a `/login`.
- [x] `/forgot-password` acepta `?token=`/`?error=` y el formulario de
  verificación respeta `Retry-After`.
- [x] Corregido `moveTaskToColumn`: al mover una tarea, la columna de origen se
  renumera sin contar la tarea movida.
- [x] Vitest 3 con 46 pruebas en 6 archivos y scripts `test`/`test:watch`.
- [x] CI en `.github/workflows/ci.yml` con install, lint, typegen, tipos, tests
  y build usando variables ficticias.
- [x] Constitución v3.0.0, especificaciones 300 y 400 reescritas, `README.md`,
  `.env.example` y este registro actualizados.
- [x] Corregido el primer deployment de la auditoría: Vitest añadió `esbuild` y
  pnpm 12 fallaba con `ERR_PNPM_IGNORED_BUILDS` porque su postinstall no estaba
  aprobado. Se añadió `esbuild: true` a `allowBuilds` y se fijó
  `"node": "22.x"` para que Vercel no resolviera Node 26.

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
  `20261111174752_harden_policy_and_function.sql` y
  `20261111174801_harden_realtime_policy_jwt_subquery.sql`.
- `rls_enabled_no_policy` (7 tablas de auth y servidor): intencionado. RLS
  activo sin policies y sin grants equivale a denegar a `anon` y
  `authenticated`; el acceso es solo server-side por `DATABASE_URL`.
- `unindexed_foreign_keys` y `unused_index`: `public.board` está vacía y
  reservada para un futuro multi-tablero; los índices por dueño aún no tienen
  tráfico que los marque como usados.

## Pendientes para próximas sesiones

Nada de esto bloquea el producto actual. Está ordenado por impacto y cada punto
incluye el estado real, el trabajo propuesto y cómo saber que está terminado,
para poder convertirlo en tareas SDD sin reanalizar el contexto.

### P1. Autenticación en Preview

**Estado:** un deployment de Preview arranca, pero falla en el primer request de
autenticación porque `BETTER_AUTH_URL` no está definida en ese entorno. La
aplicación exige una URL canónica y no usa `VERCEL_URL` a propósito: las URLs de
cada deployment son efímeras y no sirven para cookies ni enlaces de correo.

**Trabajo propuesto:**

1. Usar el alias estable de la rama (por ejemplo
   `hometable-tasks-git-master-deepsitos1.vercel.app`) como
   `BETTER_AUTH_URL` de Preview, no la URL del deployment concreto.
2. Configurar en Preview el resto de variables: `BETTER_AUTH_SECRET`,
   `DATABASE_URL`, `SUPABASE_JWT_SECRET`, `NEXT_PUBLIC_SUPABASE_*`,
   `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`, `RESEND_API_KEY` y
   `EMAIL_FROM`.
3. Añadir ese alias a los dominios permitidos del sitio de reCAPTCHA y, si se
   necesita, a `BETTER_AUTH_TRUSTED_ORIGINS`.
4. Decidir la base de datos: lo recomendable es un proyecto Supabase de pruebas
   separado. Si se comparte el de producción, asumir que cualquier prueba en
   Preview escribe datos reales.

**Terminado cuando:** se puede registrar/iniciar sesión en un deployment de
Preview, las cookies y los enlaces de correo usan el alias estable y no se
mezclan datos de producción.

### P1. Validación TLS completa en producción

**Estado:** `src/lib/db.ts` cifra la conexión pero, sin `SUPABASE_DB_CA_CERT`,
no valida la cadena TLS porque la CA de Supabase es interna
(`SELF_SIGNED_CERT_IN_CHAIN`). Es el comportamiento documentado y funcional.

**Trabajo propuesto:** descargar la CA en Supabase → Project Settings → Database
→ SSL Configuration y configurar `SUPABASE_DB_CA_CERT` en Production (saltos de
línea escapados como `\n`). Redesplegar y comprobar que la aplicación sigue
conectando.

**Terminado cuando:** login con credenciales falsas devuelve
`401 INVALID_EMAIL_OR_PASSWORD` (no un error de conexión) y ya no aparece
`SELF_SIGNED_CERT_IN_CHAIN` en los logs.

### P2. Pruebas E2E con Playwright

**Estado:** hay 46 pruebas unitarias con Vitest, pero ningún test de navegador.
El registro con reCAPTCHA/Resend y la sincronización entre dispositivos se han
validado a mano.

**Trabajo propuesto:**

1. Añadir Playwright (`playwright.config.ts`, `tests/e2e/`, scripts
   `test:e2e` y `test:e2e:ui`).
2. Cubrir primero los flujos que no dependen del correo: login con un usuario de
   prueba ya verificado, crear/editar/mover/borrar tareas, persistencia tras
   recargar y dos contextos de navegador con la misma cuenta (Realtime y sondeo).
3. Para el registro completo, separar el envío de correo detrás de una interfaz
   inyectable en `src/lib/email.ts` y usar un transporte de prueba (Mailpit o
   SMTP local) que permita leer el OTP. No crear un endpoint que exponga el
   código.
4. Usar un proyecto Supabase de pruebas y limpiar los datos entre ejecuciones.
   Nunca apuntar a producción.
5. Añadir un job opcional de CI que se salte si faltan los secretos y suba
   trazas/capturas cuando falle.

**Terminado cuando:** `pnpm test:e2e` pasa en local, cubre login + CRUD +
persistencia + dos contextos, y CI lo ejecuta o lo omite de forma explícita sin
romper el pipeline.

### P2. Protección de `master` en GitHub

**Estado:** CI se ejecuta en cada push y PR, pero nada impide integrar con
checks en rojo ni hacer push directo a `master`.

**Trabajo propuesto:** en Settings → Branches, proteger `master` y exigir el
check **Lint, tipos, tests y build**. Opcionalmente exigir pull request y
prohibir force push.

**Terminado cuando:** un PR con CI fallido no se puede fusionar y un push
directo queda bloqueado (o queda documentado como excepción consciente).

### P2. Limpieza de configuración en Vercel

**Estado:**

- `NEXT_PUBLIC_APP_URL` sigue configurada en Vercel y no se usa en el código;
  solo aparece en este registro.
- La configuración del proyecto usa Node 24.x; `engines: "22.x"` fuerza Node 22
  en cada build y genera un aviso informativo.

**Trabajo propuesto:** borrar `NEXT_PUBLIC_APP_URL` en todos los entornos y
cambiar Project Settings → Node.js Version a 22.x (o aceptar el aviso y dejar
`engines` como fuente de verdad).

**Terminado cuando:** no quedan variables huérfanas y el build deja de mostrar el
aviso de versión de Node.

### P3. Mantenimiento de tablas de autenticación

**Estado:** `checkRateLimit` limpia ventanas antiguas de `auth_rate_limit` de
forma oportunista (1 % de las llamadas), pero `consumeRateLimit` —el adaptador
de Better Auth— no lo hace. Los tokens de `verification` caducados tampoco se
purgan. Los `pending_registration` de más de 24 h se eliminan en el siguiente
registro.

**Trabajo propuesto:** añadir la misma limpieza oportunista a
`consumeRateLimit` o una migración con `pg_cron` que ejecute a diario:

```sql
delete from public.auth_rate_limit
where window_started_at < now() - interval '7 days';

delete from public.verification
where "expiresAt" < now() - interval '1 day';
```

**Terminado cuando:** existe una migración idempotente o una tarea programada,
está documentada y las tablas no crecen sin límite.

### P3. Actualizar acciones de GitHub Actions

**Estado:** el run correcto muestra un aviso de que `actions/checkout@v4`,
`actions/setup-node@v4` y `pnpm/action-setup@v4` apuntan a Node 20 y el runner
los fuerza a Node 24.

**Trabajo propuesto:** actualizar a las versiones mayores actuales y volver a
ejecutar CI. Opcionalmente fijar por SHA.

**Terminado cuando:** CI sigue en verde y desaparecen las anotaciones de
deprecación.

### P4. Funcionalidades fuera del alcance actual

Pendientes de producto, no de mantenimiento:

- Tableros compartidos (máximo 2 por usuario) e invitaciones.
- Chat asociado al tablero.
- Cambio de nombre de usuario desde la interfaz.

`public.board` y `tasks.board_id` ya existen con índice, pero no hay tablas de
invitaciones ni chat. Cualquier implementación debe empezar con una spec nueva
(`/speckit.specify`, por ejemplo `500-shared-boards`) y definir antes: membresía,
RLS por tablero, cómo se limita Realtime a los tableros del usuario y el plan de
migración. El JWT de Realtime actual solo lleva `sub`; habrá que añadir el
contexto de tablero sin abrir la lectura de tareas ajenas.

**Terminado cuando:** exista spec, plan y tareas aprobados, con migraciones
reproducibles y pruebas de aislamiento entre cuentas y tableros.

### P4. Detalles de documentación

- Añadir a la lista de commits el commit de este registro cuando se cierre la
  sesión.
- Al completar cualquier punto anterior, moverlo de esta sección al historial y
  actualizar los límites conocidos.

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

## Commits de la auditoría (12/11/2026)

25. `fd9656e` chore(db): align migrations with the remote history
26. `e8b75f9` fix(db): require the pooled URL and support CA validation
27. `88b36bb` fix(security): cap request bodies and prefer the real client IP
28. `bf3573d` fix(auth): disable direct sign-ups and persist Better Auth limits
29. `f65f4f6` fix(security): emit a per-request nonce CSP and avoid redirect loops
30. `9384496` fix(auth): sign out when the API rejects the session
31. `06661ec` fix(auth): read reset tokens and Retry-After headers
32. `8022f6e` fix(tasks): renumber the source column after moving a task
33. `5c5129c` test: add a Vitest suite for critical pure functions
34. `1ea5951` ci: run lint, types, tests and build on GitHub Actions
35. `e508331` docs: replace the constitution with the server-first v3.0.0
36. `897bdef` docs: rewrite the sync and Realtime specification
37. `436d11f` docs: rewrite the Better Auth specification
38. `a1e95ef` docs: refresh the README for the current architecture
39. `1b7f349` build: allow esbuild install scripts and pin Node 22
40. `0b9f0ee` docs: record the successful deployment and build fix
