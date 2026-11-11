# Constitución de Hometable (v3.0.0)

Hometable es una aplicación web full-stack de gestión de tareas en formato Kanban.
Next.js App Router sirve la UI y la API; PostgreSQL en Supabase es la única fuente
de verdad y Supabase Realtime mantiene sincronizados los dispositivos de una misma
cuenta. Esta constitución define las reglas no negociables para cualquier
especificación, plan o implementación.

> **Nota de versión**: la v3.0.0 sustituye la persistencia local de la v2.x. El
> almacenamiento de tareas en el navegador, la cola offline y la reconciliación
> local/remoto ya no forman parte de la arquitectura. Solo el tema vive en
> `localStorage`.

## Principios fundamentales

### I. Dominio tipado y TypeScript estricto (NO NEGOCIABLE)

- Todo el código MUST compilar con `strict: true` y sin `any` implícitos.
- Los tipos del dominio MUST vivir en `src/lib/types.ts` y derivarse de las
  constantes (`TASK_STATUSES`, `TASK_PRIORITIES`) siempre que sea posible.
- Los datos externos (cuerpo de una petición, fila de Postgres, evento de Realtime,
  formulario) MUST validarse con Zod antes de entrar al estado. Los esquemas del
  formulario están en `src/lib/validation.ts`; los del servidor, junto al repositorio
  que los consume (`src/lib/tasks-repo.ts`, `src/lib/auth-validation.ts`).
- Los cambios de modelo MUST actualizar en la misma entrega: tipos, validación,
  repositorio SQL, migración, mapeo de Realtime y pruebas afectadas.

**Justificación**: el tablero depende de un modelo estable. Un cambio de tipo no
detectado rompe la API, el mapeo de filas o la sincronización.

### II. PostgreSQL es la única fuente de verdad

- Las tareas MUST persistirse en `public.tasks` y leerse a través de `GET /api/tasks`.
  El navegador MUST NOT escribir directamente en Postgres ni usar PostgREST para el
  CRUD.
- El estado de Zustand es una **caché en memoria** con mutaciones optimistas; MUST NOT
  usar el middleware `persist` para tareas. Al fallar una escritura, la UI MUST avisar
  y recargar el estado autoritativo desde el servidor.
- MUST NOT existir cola offline, reconciliación local/remoto, datos de ejemplo,
  importación/exportación ni migración de claves `taskboard:*`.
- `owner_id` MUST derivarse de la sesión de Better Auth en el servidor y MUST NOT
  aceptarse desde el cuerpo de la petición.
- Las escrituras MUST usar SQL parametrizado (`$1`, `$2`, …) y limitar el lote
  (máximo 500 tareas por petición).
- El tema claro/oscuro es la única preferencia que MAY vivir en `localStorage`
  (gestionada por `next-themes`).

**Justificación**: una sola copia autoritativa elimina conflictos de reconciliación,
pérdidas de datos y comportamientos distintos entre dispositivos.

### III. Interfaz en español, accesible y adaptable

- Todo texto visible para el usuario MUST estar en español de forma consistente.
- Las interacciones MUST ser operables con ratón, táctil y teclado. El arrastre MUST
  anunciar el resultado y MUST existir una alternativa «Mover a» en el menú de cada
  tarjeta.
- Los controles MUST tener nombre accesible, foco visible y estados anunciados (ARIA
  live) cuando cambie el tablero.
- La interfaz MUST funcionar en móvil, tableta y escritorio, y MUST respetar los temas
  claro, oscuro y sistema.
- Los estados de carga MUST mostrar el esqueleto del tablero, nunca datos parciales que
  provoquen saltos.

**Justificación**: la accesibilidad y el diseño responsive son parte del producto, no
una mejora opcional posterior.

### IV. Fronteras server/client claras y componentes compartidos

- La UI MUST reutilizar `src/components/ui/` (shadcn/ui, estilo `radix-nova`) y los
  tokens de `src/app/globals.css`. No se crearán estilos ad-hoc que dupliquen
  variantes existentes.
- Los componentes que usan estado, efectos, `localStorage` o APIs del navegador MUST
  declarar `"use client"`. Los componentes de servidor MUST permanecer sin estado y
  sin acceso al navegador.
- La sesión MUST leerse en el servidor con `getSession()` (`src/lib/auth-server.ts`);
  el cliente MAY usar `authClient` solo para acciones de sesión.
- La lógica de negocio reutilizable (filtros, orden, estadísticas, movimientos) MUST
  vivir en `src/lib/task-utils.ts`; el estado global, en `src/store/task-store.ts`.
- Las rutas de importación MUST usar el alias `@/*`.
- El acceso a datos MUST concentrarse en `src/lib/tasks-repo.ts`; las rutas de API no
  construyen SQL.

**Justificación**: separar dominio, acceso a datos, estado y presentación evita
duplicación, fugas de secretos al cliente y errores de hidratación.

### V. Seguridad por defecto

- La autenticación MUST ser obligatoria. Ninguna ruta del tablero o de la API de
  tareas MUST responder sin una sesión válida y un correo verificado.
- Better Auth MUST tener `disableSignUp: true`: el único alta posible es
  `/api/auth/register`, que valida reCAPTCHA y crea la cuenta solo tras confirmar el
  OTP.
- Las contraseñas y los OTP MUST almacenarse hasheados. Los OTP MUST caducar (10 min)
  y limitar intentos (5). El registro pendiente MUST vincularse al navegador con una
  cookie `httpOnly` firmada.
- Las rutas de escritura MUST exigir mismo origen (`Origin` válido) además de la cookie
  `SameSite=Lax`.
- El rate limit MUST ser persistente en Postgres y compartirse entre instancias
  serverless. Los mensajes de registro y reenvío MUST ser genéricos para no enumerar
  correos.
- Ningún secreto MAY exponerse al cliente. Solo las variables `NEXT_PUBLIC_*` llegan al
  navegador. `.env.local` MUST permanecer fuera de git.
- La CSP MUST emitirse con un nonce por petición desde `src/proxy.ts` y MUST permitir
  únicamente los orígenes necesarios para reCAPTCHA y Supabase (incluido
  `wss://*.supabase.co`).
- `tasks` MUST tener RLS activo. A `authenticated` solo se le concede `SELECT` de las
  filas cuyo `owner_id` coincide con el claim `sub` del JWT de Realtime. Las escrituras
  MUST quedar revocadas para `anon` y `authenticated`.
- Toda migración nueva MUST ser idempotente y MUST poder aplicarse en orden desde un
  proyecto vacío.

**Justificación**: el proyecto está expuesto públicamente en Vercel y usa claves
públicas de Supabase; la seguridad real depende de la sesión, el servidor y RLS.

### VI. Realtime autenticado como función secundaria

- Supabase Realtime MUST seguir funcionando para la **misma cuenta en varios
  dispositivos** (INSERT, UPDATE y DELETE de las tareas propias).
- El canal MUST autenticarse con un JWT HS256 de 15 minutos emitido por
  `/api/realtime/token` con `sub = user.id`, `role = authenticated` y
  `aud = authenticated`.
- La policy de Realtime MUST comparar `owner_id` con `auth.jwt() ->> 'sub'` dentro de
  una subconsulta y `tasks` MUST usar `REPLICA IDENTITY FULL` para que los DELETE
  incluyan el dueño.
- El sondeo de `use-tasks-sync` (30 s, más foco y reconexión) MUST seguir existiendo
  como respaldo si faltan variables, el token falla o el WebSocket se cae.
- Realtime MUST NOT conceder escrituras ni acceso a tareas de otras cuentas.

**Justificación**: Realtime mejora la experiencia multi-dispositivo, pero no puede
convertirse en la única vía de consistencia ni abrir la tabla a escrituras del cliente.

### VII. Verificación obligatoria antes de integrar

Toda entrega MUST superar, en este orden:

1. `pnpm lint` — ESLint 9 con `eslint-config-next`.
2. `pnpm exec next typegen` — tipos de rutas (`LayoutProps`, `PageProps`).
3. `pnpm exec tsc --noEmit` — tipos en modo estricto.
4. `pnpm test` — Vitest sobre utilidades, validación, mapeo, HTTP y tokens.
5. `pnpm build` — compilación de producción de Next.js.
6. QA manual descrita en el plan: arrastrar y soltar (ratón, táctil y teclado),
   persistencia tras recargar, Realtime entre dos dispositivos, sondeo de respaldo,
   undo, filtros, búsqueda, orden, responsive, temas y anuncios ARIA.

- No se considerará terminada una tarea si falla cualquiera de las puertas.
- La integración continua de `.github/workflows/ci.yml` MUST ejecutar las cinco puertas
  automatizadas en cada push a `master` y en cada pull request.
- Las pruebas MUST cubrir, como mínimo, las funciones puras de `task-utils`,
  `validation`, `auth-validation`, `task-mapper`, `http` y `realtime-token`.

**Justificación**: el proyecto se despliega automáticamente; una regresión no detectada
llega a producción en minutos.

## Restricciones técnicas y stack

- **Runtime**: Node.js 22 (`.nvmrc`) y pnpm 12 (campo `packageManager`).
- **Framework**: Next.js 16 (App Router, Turbopack) con React 19.
- **Lenguaje**: TypeScript 5, modo `strict`, alias `@/*` hacia `src/*`.
- **Estilos**: Tailwind CSS 4 y shadcn/ui (`components.json`, estilo `radix-nova`,
  variables CSS en `src/app/globals.css`).
- **Estado**: Zustand 5 en memoria, sin `persist` para tareas.
- **Formularios y validación**: React Hook Form + Zod 4.
- **Autenticación**: Better Auth 1.x con adaptador `pg` sobre el pooler de Supabase.
- **Base de datos**: PostgreSQL en Supabase; migraciones versionadas en
  `supabase/migrations/`.
- **Realtime**: `@supabase/supabase-js` 2.x con JWT corto firmado en el servidor.
- **Correo**: Resend con dominio verificado y sin remitente de respaldo.
- **Pruebas**: Vitest 3 (`pnpm test`), entorno `node`.
- **Arrastrar y soltar**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- **Fechas**: date-fns 4 con locale `es`; las fechas de solo día viajan como
  `YYYY-MM-DD`.
- **Despliegue**: Vercel (plan Hobby); cada push a `master` despliega.

## Flujo de trabajo y puertas de calidad

- El flujo es Spec-Driven Development con Spec Kit:
  `/speckit.constitution` → `/speckit.specify` → `/speckit.clarify` (opcional) →
  `/speckit.plan` → `/speckit.tasks` → `/speckit.analyze` → `/speckit.implement`.
- Cada funcionalidad vive en `specs/NNN-nombre/` y se desarrolla en una rama
  `NNN-nombre`; `master` MUST permanecer desplegable.
- Las plantillas efectivas del proyecto están en `.specify/templates/overrides/`; las
  plantillas core no se editan.
- Todo plan MUST incluir la sección «Verificación constitucional» y toda lista de
  tareas MUST terminar con las puertas de calidad y el QA manual.
- Los commits MUST seguir Conventional Commits en inglés (`feat:`, `fix:`, `docs:`,
  `chore:`, `refactor:`), pequeños y atómicos.
- Los documentos SDD y la UI MUST escribirse en español.

## Gobernanza

- Esta constitución prevalece sobre cualquier otra práctica o preferencia.
- Toda enmienda MUST documentarse con: motivación, principios afectados, impacto en
  funcionalidades existentes y plan de migración si aplica.
- La versión sigue SemVer: MAJOR por eliminación o redefinición incompatible de
  principios; MINOR por principio o sección nueva; PATCH por aclaraciones.
- Toda revisión de spec, plan o tareas MUST verificar el cumplimiento de estos
  principios. Una violación MUST justificarse explícitamente en la sección de
  complejidad del plan o rechazarse.
- La guía operativa para agentes está en `AGENTS.md`; este documento es la autoridad en
  caso de conflicto.

## Enmienda constitucional v3.0.0

**Fecha**: 2026-11-11

**Motivación**: la aplicación pasó de una SPA con `localStorage` y sincronización
opcional a una aplicación full-stack con autenticación obligatoria, servidor como
única fuente de verdad y Realtime autenticado por RLS.

**Principios afectados**:

- **II. Persistencia**: se elimina `localStorage` como fuente de respaldo, la cola
  offline, la reconciliación y la importación/exportación. PostgreSQL es la única
  fuente de verdad.
- **IV. Fronteras**: se formaliza el acceso a datos en el servidor y la lectura de
  sesión con `getSession()`.
- **V. Seguridad**: se añaden autenticación obligatoria, registro diferido con OTP,
  rate limit persistente, CSP con nonce y RLS de solo lectura por `sub`.
- **VI. Alcance**: se sustituye «backend propio fuera de alcance» por Next.js como
  backend y Realtime autenticado como función secundaria.
- **VII. Verificación**: se incorpora Vitest y la integración continua.

**Impacto**:

- Los usuarios existentes de la versión local no tienen migración automática de
  `taskboard:*`; deben crear una cuenta y volver a introducir sus tareas.
- La aplicación deja de funcionar offline: sin servidor no hay tablero.
- Realtime sigue disponible para la misma cuenta en varios dispositivos.

**Plan de migración**:

1. Sustituir el store persistido por estado en memoria y carga desde `/api/tasks`.
2. Mover el CRUD a rutas server-side autenticadas y revocar los privilegios de
   PostgREST.
3. Introducir Better Auth, el registro diferido y la verificación por OTP.
4. Reintroducir Realtime con JWT corto y RLS de solo lectura.
5. Versionar y ordenar las migraciones de Supabase según el historial remoto.
6. Añadir Vitest, CI y actualizar todos los artefactos SDD.

**Versión**: 3.0.0 | **Ratificada**: 2026-11-11 | **Última enmienda**: 2026-11-11
