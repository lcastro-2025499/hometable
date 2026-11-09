# Tareas: [NOMBRE DE LA FUNCIONALIDAD]

**Entrada**: Documentos de diseño de `specs/[###-nombre]/`

**Prerrequisitos**: `plan.md` (obligatorio), `spec.md` (obligatorio para las
historias), `research.md`, `data-model.md` y `contracts/` (si existen).

**Pruebas**: el proyecto no tiene framework automatizado. La verificación
obligatoria es `pnpm lint`, `pnpm exec next typegen` + `pnpm exec tsc --noEmit`,
`pnpm build` y el QA manual de esta plantilla. Si la especificación pide tests
explícitamente, añade tareas de test además de las puertas.

**Organización**: las tareas se agrupan por historia de usuario para que cada una
pueda implementarse, probarse y entregarse por separado.

## Formato: `[ID] [P?] [Historia] Descripción`

- **[P]**: puede ejecutarse en paralelo (archivos distintos, sin dependencias).
- **[Historia]**: historia a la que pertenece (`US1`, `US2`, `US3`...).
- Incluye siempre la ruta exacta del archivo en la descripción.

## Convenciones de rutas

- Aplicación de una sola página en `src/`.
- Componentes de tablero en `src/components/board/`.
- Componentes de tareas en `src/components/tasks/`.
- Componentes base en `src/components/ui/` (solo shadcn/ui reutilizable).
- Hooks en `src/hooks/`.
- Dominio, validación y utilidades en `src/lib/`.
- Estado global en `src/store/task-store.ts`.
- Documentación de la funcionalidad en `specs/[###-nombre]/`.

## Fase 1: Preparación

**Propósito**: confirmar el alcance y los archivos afectados antes de escribir
código.

- [ ] T001 Revisar `specs/[###-nombre]/spec.md` y `plan.md`; listar los archivos
  exactos que se modificarán y los que no.
- [ ] T002 [P] Revisar `src/lib/types.ts`, `src/lib/validation.ts` y
  `src/lib/constants.ts` para confirmar si el modelo o los límites cambian.
- [ ] T003 [P] Confirmar que no se requieren dependencias nuevas; si se requieren,
  documentar la justificación en `plan.md` antes de instalarlas.

---

## Fase 2: Base compartida

**Propósito**: infraestructura que debe existir antes de las historias.

- [ ] T004 Actualizar el modelo en `src/lib/types.ts` y los esquemas Zod en
  `src/lib/validation.ts` (si aplica).
- [ ] T005 [P] Ajustar constantes, límites o metadatos visuales en
  `src/lib/constants.ts` (si aplica).
- [ ] T006 [P] Añadir o ajustar helpers puros en `src/lib/task-utils.ts`.
- [ ] T007 Actualizar el estado y las acciones en `src/store/task-store.ts`
  manteniendo la compatibilidad con `localStorage` (`taskboard:v2`) o la
  migración documentada, incluida la sincronización opcional si aplica.
- [ ] T008 [P] Actualizar datos de ejemplo en `src/lib/seed.ts` (si el modelo
  cambia).

---

## Fase 3: Historia de usuario 1 (Prioridad: P1) — [TÍTULO]

**Objetivo**: [Resultado observable de la historia.]

**Prueba independiente**: [Cómo se demuestra sola, con los pasos concretos.]

- [ ] T009 [US1] Implementar la lógica de la historia en `src/lib/task-utils.ts`
  o `src/store/task-store.ts`.
- [ ] T010 [P] [US1] Crear o ajustar el componente en
  `src/components/tasks/[componente].tsx`.
- [ ] T011 [US1] Integrar el componente en `src/components/board/[componente].tsx`.
- [ ] T012 [US1] Añadir textos en español y etiquetas ARIA en el componente.
- [ ] T013 [US1] Verificar el flujo manual descrito en la prueba independiente.

---

## Fase 4: Historia de usuario 2 (Prioridad: P2) — [TÍTULO]

**Objetivo**: [Resultado observable de la historia.]

**Prueba independiente**: [Cómo se demuestra sola.]

- [ ] T014 [US2] Implementar la lógica en `src/lib/` o `src/store/`.
- [ ] T015 [P] [US2] Crear o ajustar el componente en `src/components/`.
- [ ] T016 [US2] Integrar en el tablero y comprobar que no rompe la historia P1.
- [ ] T017 [US2] Verificar accesibilidad y responsive del flujo nuevo.

---

## Fase 5: Historia de usuario 3 (Prioridad: P3) — [TÍTULO]

**Objetivo**: [Resultado observable de la historia.]

**Prueba independiente**: [Cómo se demuestra sola.]

- [ ] T018 [US3] Implementar la lógica en `src/lib/` o `src/store/`.
- [ ] T019 [P] [US3] Crear o ajustar el componente en `src/components/`.
- [ ] T020 [US3] Integrar en el tablero y comprobar regresiones.
- [ ] T021 [US3] Verificar accesibilidad, responsive y temas.

> Añade tantas fases de historia como tenga la especificación, manteniendo el
> orden de prioridad (P1 → P2 → P3) y la independencia de cada una.

---

## Fase final: Pulido y verificación

**Propósito**: dejar la funcionalidad lista para integrar a `master`.

- [ ] T022 [P] Revisar textos en español y coherencia visual con el resto del
  tablero.
- [ ] T023 [P] Revisar que no se introdujeron dependencias ni estilos ad-hoc
  innecesarios.
- [ ] T024 Ejecutar `pnpm lint` y corregir todos los errores y warnings nuevos.
- [ ] T025 Ejecutar `pnpm exec next typegen` para generar los tipos de rutas.
- [ ] T026 Ejecutar `pnpm exec tsc --noEmit` y corregir todos los errores de tipos.
- [ ] T027 Ejecutar `pnpm build` y confirmar que la compilación de producción pasa.
- [ ] T028 Ejecutar el QA manual de `plan.md`:
  - [ ] Crear, editar, duplicar y eliminar con deshacer.
  - [ ] Mover con ratón, táctil y teclado; probar el menú "Mover a".
  - [ ] Recargar y comprobar persistencia y orden.
  - [ ] Abrir dos pestañas y comprobar la sincronización.
  - [ ] Exportar, limpiar e importar el JSON.
  - [ ] Probar búsqueda, filtros y orden.
  - [ ] Revisar móvil, tableta, escritorio y temas claro/oscuro/sistema.
  - [ ] Navegar solo con teclado y comprobar foco y anuncios ARIA.
- [ ] T029 Actualizar `README.md` si la funcionalidad cambia el uso, el modelo de
  datos o la persistencia.

---

## Dependencias y orden

- La Fase 1 no depende de nada; la Fase 2 depende de la Fase 1.
- Cada historia depende de la Fase 2 y no debe depender de otra historia.
- La Fase final depende de todas las historias incluidas en la entrega.
- Las tareas marcadas `[P]` pueden ejecutarse en paralelo si no comparten archivo.

## Estrategia de entrega

1. Completar Fase 1 y Fase 2.
2. Implementar P1 y verificarla de forma independiente (MVP).
3. Añadir P2 y P3 sin romper P1.
4. Ejecutar la fase final completa antes de fusionar a `master`.

## Checklist de requisitos

- [ ] `specs/[###-nombre]/checklists/requirements.md` revisada y sin puntos
  abiertos (si se generó).
- [ ] Cada requisito funcional tiene al menos una tarea asociada.
- [ ] Cada caso límite de la especificación tiene cobertura manual o test.
