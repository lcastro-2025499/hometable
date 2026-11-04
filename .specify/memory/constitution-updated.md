# Constitución de Hometable (v2.1.0)

Hometable es un tablero Kanban que puede funcionar con persistencia local o en tiempo real a través de un servicio externo (Supabase). Esta constitución define las reglas no negociables para cualquier especificación, plan o implementación.

> **Nota**: Esta constitución v2.1.0 incluye una enmienda para soportar sincronización multi-dispositivo con Supabase.

## Principios fundamentales

### I. Dominio tipado y TypeScript estricto (NO NEGOCIABLE)

- Todo el código MUST compilar con `strict: true` y sin `any` implícitos.
- Los tipos del dominio MUST vivir en `src/lib/types.ts` y derivarse de las constantes (`TASK_STATUSES`, `TASK_PRIORITIES`) siempre que sea posible.
- Los datos externos (importación JSON, `localStorage`, Supabase, formularios) MUST validarse con Zod en `src/lib/validation.ts` antes de entrar al estado.
- Los cambios de modelo MUST actualizar tipos, validación, datos de ejemplo y pruebas manuales afectadas en la misma entrega.

**Justificación**: el tablero depende de un modelo de tarea estable; un cambio de tipo no detectado rompe la persistencia y la importación de copias de seguridad.

### II. Persistencia híbrida: localStorage como fallback primario

- **Modo principal**: Persistencia local con clave `taskboard:v2` en `localStorage` (ver `src/lib/constants.ts`).
- **Modo opcional**: Sincronización en tiempo real vía Supabase Realtime cuando el usuario elija conectar.
- **Migración**: Los datos de `taskboard:v1` pueden migrarse a `taskboard:v2`.
- **Sincronización entre pestañas**: Continúa usando el evento `storage` del navegador para mantener consistencia inmediata.
- **Orden visual**: Filtros, ordenamiento y tema MUST permanecer en memoria o en `next-themes`, salvo que el usuario elija sincronizarlos explícitamente.
- Todo cambio incompatible del formato persistido MUST incluir una estrategia de migración o una nueva versión de clave, y MUST documentarse en el plan.
- La lectura de `localStorage` MUST ocurrir después del montaje (ver `src/hooks/use-hydrated.ts`) para evitar desajustes de hidratación.
- La importación MUST rechazar archivos inválidos y duplicados sin destruir los datos existentes; la exportación MUST producir un JSON reimportable.

**Justificación**: los datos del usuario pueden existir sin conexión; el localStorage garantiza disponibilidad offline y es el mecanismo de respaldo principal. La sincronización en Supabase es una capa adicional que MEJORA la experiencia sin eliminar la funcionalidad base.

### III. Interfaz en español, accesible y adaptable

- Todo texto visible para el usuario MUST estar en español de forma consistente.
- Las interacciones MUST ser operables con ratón, táctil y teclado. El arrastre MUST anunciar el resultado y MUST existir una alternativa "Mover a" en el menú de cada tarjeta.
- Los controles MUST tener nombre accesible, foco visible y estados anunciados (ARIA live) cuando cambie el tablero.
- La interfaz MUST funcionar en móvil (carrusel por columna), tableta y escritorio, y MUST respetar los temas claro, oscuro y sistema.
- Los estados de carga MUST mostrar el esqueleto del tablero, nunca datos parciales que provoquen saltos o desajustes.

**Justificación**: la accesibilidad y el diseño responsive son parte del producto, no una mejora opcional posterior.

### IV. Componentes compartidos y fronteras server/client claras

- La UI MUST reutilizar los componentes de `src/components/ui/` (shadcn/ui, estilo `radix-nova`) y los tokens de `src/app/globals.css`. No se crearán estilos ad-hoc que dupliquen variantes existentes.
- Los componentes que usan estado, efectos, `localStorage` o APIs del navegador MUST declarar `"use client"`. Los componentes de servidor MUST permanecer sin estado y sin acceso al navegador.
- La lógica de negocio reutilizable (filtros, orden, estadísticas, movimientos) MUST vivir en `src/lib/task-utils.ts`; el estado global en `src/store/task-store.ts`.
- Las rutas de importación MUST usar el alias `@/*`.

**Justificación**: separar dominio, estado y presentación mantiene el tablero probable y evita errores de hidratación.

### V. Verificación obligatoria antes de integrar

Toda entrega MUST superar, en este orden:

1. `pnpm lint` — ESLint 9 con `eslint-config-next` (Core Web Vitals + TypeScript).
2. `pnpm exec next typegen` — genera los tipos de rutas (`LayoutProps`, `PageProps`).
3. `pnpm exec tsc --noEmit` — comprobación de tipos en modo estricto.
4. `pnpm build` — compilación de producción de Next.js.
5. QA manual descrita en el plan: arrastrar y soltar (ratón, táctil y teclado), persistencia tras recargar, sincronización entre pestañas, sincronización multi-dispositivo, exportar/importar, undo, filtros, búsqueda, orden, responsive, temas y anuncios ARIA.

- No se considerará terminada una tarea si falla cualquiera de las puertas.
- Mientras el proyecto no tenga framework de tests, estas puertas y el QA manual son la verificación oficial.
- Si una funcionalidad solicita tests explícitamente, el plan MUST incluir las tareas correspondientes además de las puertas anteriores.

**Justificación**: el proyecto no tiene backend ni suite automatizada; sin estas comprobaciones, los errores llegan directamente a producción en Vercel.

### VI. Persistencia y sincronización multi-dispositivo

- **LocalStorage**: sigue siendo el mecanismo principal de persistencia y respaldo.
- **Supabase**: servicio externo gratuito para sincronización en tiempo real.
- **Backend propio**: sigue fuera de alcance.
- **Backend externo**: se permite el uso de servicios gratuitos como Supabase.
- **Sincronización en tiempo real**: se implementa mediante WebSockets de Supabase.

**Justificación**: el valor del producto es un tablero local, rápido y con sincronización opcional sin infraestructura propia.

## Restricciones técnicas y stack

- **Runtime**: Node.js 22 (`.nvmrc`) y pnpm 12 (campo `packageManager`).
- **Framework**: Next.js 16 (App Router, Turbopack) con React 19.
- **Lenguaje**: TypeScript 5, modo `strict`, alias `@/*` hacia `src/*`.
- **Estilos**: Tailwind CSS 4 y shadcn/ui (`components.json`, estilo `radix-nova`, variables CSS en `src/app/globals.css`).
- **Estado**: Zustand 5 con middleware `persist` (localStorage) + suscripciones a Supabase Realtime.
- **Formularios y validación**: React Hook Form + Zod 4.
- **Arrastrar y soltar**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- **Fechas**: date-fns 4 con locale `es`.
- **UI auxiliar**: lucide-react, sonner, next-themes, cmdk, Radix UI.
- **Base de datos externa**: Supabase (capa gratuita) para sincronización en tiempo real; localStorage como fallback.
- **Despliegue**: Vercel (plan Hobby); cada push a `master` despliega.

## Flujo de trabajo y puertas de calidad

- El flujo es Spec-Driven Development con Spec Kit:
  `/speckit.constitution` → `/speckit.specify` → `/speckit.clarify` (opcional) → `/speckit.plan` → `/speckit.tasks` → `/speckit.analyze` → `/speckit.implement`.
- Cada funcionalidad vive en `specs/NNN-nombre/` y se desarrolla en una rama `NNN-nombre`; `master` MUST permanecer desplegable.
- Las plantillas efectivas del proyecto están en `.specify/templates/overrides/`; las plantillas core no se editan.
- Todo plan MUST incluir la sección "Verificación constitucional" y toda lista de tareas MUST terminar con las puertas de calidad y el QA manual.
- Los commits MUST seguir el estilo Conventional Commits ya usado en el repositorio (`feat:`, `fix:`, `docs:`, `chore:`).

## Gobernanza

- Esta constitución prevalece sobre cualquier otra práctica o preferencia.
- Toda enmienda MUST documentarse con: motivación, principios afectados, impacto en funcionalidades existentes y plan de migración si aplica.
- La versión sigue SemVer: MAJOR por eliminación o redefinición incompatible de principios; MINOR por principio o sección nueva; PATCH por aclaraciones.
- Toda revisión de spec, plan o tareas MUST verificar el cumplimiento de estos principios. Una violación MUST justificarse explícitamente en la sección de complejidad del plan o rechazarse.
- La guía operativa para agentes está en `AGENTS.md`; este documento es la autoridad en caso de conflicto.

## Enmienda constitucional v2.1.0

**Fecha**: 2026-11-04

**Motivación**: Implementación de sincronización multi-dispositivo con Supabase.

**Principios afectados**:
- II. Persistencia: Cambio de persistencia local única a persistencia híbrida con Supabase.
- VI. Simplicidad y alcance: Permitir servicios externos gratuitos como Supabase.

**Impacto**:
- Los usuarios existentes mantienen sus datos en localStorage.
- Nuevos usuarios pueden optar por sincronizar con Supabase.
- La app funciona 100% offline como antes.

**Plan de migración**:
1. Mantener localStorage como capa de respaldo.
2. Ofrecer sincronización manual al usuario.
3. Actualizar documentación (README, QA).
4. Actualizar clave de versión a `taskboard:v2`.

**Versión**: 2.1.0 | **Ratificada**: 2026-11-04 | **Última enmienda**: 2026-11-04