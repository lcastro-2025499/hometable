# Constitución de Hometable

Hometable es un tablero Kanban personal, sin backend, que guarda las tareas en el
`localStorage` del navegador. Esta constitución define las reglas no negociables
para cualquier especificación, plan o implementación.

## Principios fundamentales

### I. Dominio tipado y TypeScript estricto (NO NEGOCIABLE)

- Todo el código MUST compilar con `strict: true` y sin `any` implícitos.
- Los tipos del dominio MUST vivir en `src/lib/types.ts` y derivarse de las
  constantes (`TASK_STATUSES`, `TASK_PRIORITIES`) siempre que sea posible.
- Los datos externos (importación JSON, `localStorage`, formularios) MUST
  validarse con Zod en `src/lib/validation.ts` antes de entrar al estado.
- Los cambios de modelo MUST actualizar tipos, validación, datos de ejemplo y
  pruebas manuales afectadas en la misma entrega.

### II. Persistencia local como contrato explícito

- La única fuente de persistencia es `localStorage` con la clave `taskboard:v1`
  (`src/lib/constants.ts`). No se introducirá backend, base de datos ni cuentas.
- Solo se persisten las tareas. Filtros, orden visual y tema MUST permanecer en
  memoria o en `next-themes`.
- Todo cambio incompatible del formato persistido MUST incluir una estrategia de
  migración o una nueva versión de clave, y MUST documentarse en el plan.
- La lectura de `localStorage` MUST ocurrir después del montaje (ver
  `src/hooks/use-hydrated.ts`) para evitar desajustes de hidratación.
- La importación MUST rechazar archivos inválidos y duplicados sin destruir los
  datos existentes; la exportación MUST producir un JSON reimportable.

### III. Interfaz en español, accesible y adaptable

- Todo texto visible para el usuario MUST estar en español de forma consistente.
- Las interacciones MUST ser operables con ratón, táctil y teclado. El arrastre
  MUST anunciar el resultado y MUST existir una alternativa "Mover a" en el menú
  de cada tarjeta.
- Los controles MUST tener nombre accesible, foco visible y estados anunciados
  (ARIA live) cuando cambie el tablero.
- La interfaz MUST funcionar en móvil (carrusel por columna), tableta y escritorio,
  y MUST respetar los temas claro, oscuro y sistema.
- Los estados de carga MUST mostrar el esqueleto del tablero, nunca datos
  parciales que provoquen saltos o desajustes.

### IV. Componentes compartidos y fronteras server/client claras

- La UI MUST reutilizar los componentes de `src/components/ui/` (shadcn/ui,
  estilo `radix-nova`) y los tokens de `src/app/globals.css`. No se crearán
  estilos ad-hoc que dupliquen variantes existentes.
- Los componentes que usan estado, efectos, `localStorage` o APIs del navegador
  MUST declarar `"use client"`. Los componentes de servidor MUST permanecer sin
  estado y sin acceso al navegador.
- La lógica de negocio reutilizable (filtros, orden, estadísticas, movimientos)
  MUST vivir en `src/lib/task-utils.ts`; el estado global en
  `src/store/task-store.ts`.
- Las rutas de importación MUST usar el alias `@/*`.

### V. Verificación obligatoria antes de integrar

Toda entrega MUST superar, en este orden:

1. `pnpm lint` — ESLint 9 con `eslint-config-next` (Core Web Vitals + TypeScript).
2. `pnpm exec next typegen` — genera los tipos de rutas (`LayoutProps`, `PageProps`).
3. `pnpm exec tsc --noEmit` — comprobación de tipos en modo estricto.
4. `pnpm build` — compilación de producción de Next.js.
5. QA manual descrita en el plan: arrastrar y soltar (ratón, táctil y teclado),
   persistencia tras recargar, sincronización entre pestañas, exportar/importar,
   undo, filtros, búsqueda, orden, responsive, temas y anuncios ARIA.

- No se considerará terminada una tarea si falla cualquiera de las puertas.
- Mientras el proyecto no tenga framework de tests, estas puertas y el QA manual
  son la verificación oficial. Añadir Vitest, Playwright u otro framework requiere
  una enmienda a esta constitución.
- Si una funcionalidad solicita tests explícitamente, el plan MUST incluir las
  tareas correspondientes además de las puertas anteriores.

### VI. Simplicidad y alcance acotado

- Se MUST preferir la solución más simple que cumpla los requisitos (YAGNI).
- No se añadirán dependencias sin justificar el problema, el tamaño y la
  alternativa ya disponible en el stack.
- Están fuera de alcance: cuentas de usuario, sincronización entre dispositivos,
  colaboración en tiempo real, backend/API propia y notificaciones push.
- Las funcionalidades nuevas MUST encajar en el modelo de una sola página con
  persistencia local; si requieren un servicio externo, MUST pasar por una
  enmienda constitucional.

## Restricciones técnicas y stack

- **Runtime**: Node.js 22 (`.nvmrc`) y pnpm 12 (campo `packageManager`).
- **Framework**: Next.js 16 (App Router, Turbopack) con React 19.
- **Lenguaje**: TypeScript 5, modo `strict`, alias `@/*` hacia `src/*`.
- **Estilos**: Tailwind CSS 4 y shadcn/ui (`components.json`, estilo
  `radix-nova`, variables CSS en `src/app/globals.css`).
- **Estado**: Zustand 5 con middleware `persist`.
- **Formularios y validación**: React Hook Form + Zod 4.
- **Arrastrar y soltar**: `@dnd-kit/core`, `@dnd-kit/sortable`,
  `@dnd-kit/utilities`.
- **Fechas**: date-fns 4 con locale `es`.
- **UI auxiliar**: lucide-react, sonner, next-themes, cmdk, Radix UI.
- **Despliegue**: Vercel (plan Hobby); cada push a `master` despliega.

## Flujo de trabajo y puertas de calidad

- El flujo es Spec-Driven Development con Spec Kit:
  `/speckit.constitution` → `/speckit.specify` → `/speckit.clarify` (opcional) →
  `/speckit.plan` → `/speckit.tasks` → `/speckit.analyze` → `/speckit.implement`.
- Cada funcionalidad vive en `specs/NNN-nombre/` y se desarrolla en una rama
  `NNN-nombre`; `master` MUST permanecer desplegable.
- Las plantillas efectivas del proyecto están en
  `.specify/templates/overrides/`; las plantillas core no se editan.
- Todo plan MUST incluir la sección "Verificación constitucional" y toda lista de
  tareas MUST terminar con las puertas de calidad y el QA manual.
- Los commits MUST seguir el estilo Conventional Commits ya usado en el
  repositorio (`feat:`, `fix:`, `docs:`, `chore:`).

## Gobernanza

- Esta constitución prevalece sobre cualquier otra práctica o preferencia.
- Toda enmienda MUST documentarse con: motivación, principios afectados, impacto
  en funcionalidades existentes y plan de migración si aplica.
- La versión sigue SemVer: MAJOR por eliminación o redefinición incompatible de
  principios; MINOR por principio o sección nueva; PATCH por aclaraciones.
- Toda revisión de spec, plan o tareas MUST verificar el cumplimiento de estos
  principios. Una violación MUST justificarse explícitamente en la sección de
  complejidad del plan o rechazarse.
- La guía operativa para agentes está en `AGENTS.md`; este documento es la
  autoridad en caso de conflicto.

**Versión**: [CONSTITUTION_VERSION] | **Ratificada**: [RATIFICATION_DATE] | **Última enmienda**: [LAST_AMENDED_DATE]
