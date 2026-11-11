# Progreso: modernización de Hometable

**Sesión:** migración a servidor como fuente única de verdad, Realtime
autenticado y endurecimiento de seguridad.

**Estado:** implementación terminada y compilación en verde. Queda pendiente el
QA manual en navegador con dos dispositivos y la configuración de
`SUPABASE_JWT_SECRET` en los entornos desplegados.

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

## QA manual pendiente

Requiere navegador y, para Realtime, `SUPABASE_JWT_SECRET` en `.env.local` y en
Vercel (Production, Preview y Development).

1. Registrar una cuenta, recibir el OTP, verificar e iniciar sesión.
2. Abrir la misma cuenta en dos dispositivos o ventanas.
3. Crear, editar, mover y borrar tareas en una ventana y comprobar que la otra
   recibe los cambios por WebSocket.
4. Confirmar que las escrituras siguen funcionando con Realtime deshabilitado
   (sondeo cada 30 s).
5. Comprobar que el registro y el reenvío no revelan si un correo existe.
6. Confirmar que una cuenta no puede leer ni modificar tareas de otra.
7. Revisar las cabeceras de seguridad y que la CSP no bloquee reCAPTCHA ni el
   WebSocket.

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
