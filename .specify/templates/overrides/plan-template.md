# Plan de implementación: [FUNCIONALIDAD]

**Rama**: `[###-nombre]` | **Fecha**: [FECHA] | **Especificación**: [ENLACE A spec.md]

**Entrada**: Especificación de `specs/[###-nombre]/spec.md`

**Nota**: Este plan lo genera `/speckit.plan` a partir de la especificación y de
la constitución de Hometable (`.specify/memory/constitution.md`).

## Resumen

[Extrae de la especificación el requisito principal y el enfoque técnico. Explica
en 2-4 frases qué se construye, qué archivos se tocan y cómo se verifica.]

## Contexto técnico

<!-- Estos valores son fijos para Hometable. Solo cambia lo que sea específico de
la funcionalidad y marca lo desconocido con el marcador técnico
[NEEDS CLARIFICATION: pregunta en español]. -->

- **Lenguaje/Versión**: TypeScript 5 en modo `strict`; Node.js 22 y pnpm 12.
- **Framework**: Next.js 16 (App Router, Turbopack) con React 19.
- **Dependencias principales**: Zustand 5 (`persist`), Zod 4, React Hook Form,
  `@dnd-kit/core` + `@dnd-kit/sortable`, date-fns 4 (locale `es`), sonner,
  next-themes, lucide-react, Radix UI y shadcn/ui (estilo `radix-nova`).
- **Estilos**: Tailwind CSS 4 y tokens de `src/app/globals.css`.
- **Almacenamiento**: `localStorage` con clave `taskboard:v2` como base; Supabase
  opcional para sincronización multi-dispositivo. Sin backend propio.
- **Pruebas**: no hay framework automatizado. Puertas oficiales: `pnpm lint`,
  `pnpm exec next typegen` + `pnpm exec tsc --noEmit`, `pnpm build` y QA manual.
- **Plataforma objetivo**: navegadores modernos (Chrome, Edge, Firefox, Safari)
  en escritorio, tableta y móvil; despliegue en Vercel.
- **Tipo de proyecto**: aplicación web de una sola página con persistencia local.
- **Objetivos de rendimiento**: interacción percibida como inmediata con cientos
  de tareas; sin renders innecesarios del tablero completo.
- **Restricciones**: accesibilidad con teclado y ARIA, interfaz en español,
  responsive, temas claro/oscuro/sistema, `master` siempre desplegable.
- **Escala/alcance**: tablero personal; cientos de tareas y etiquetas.

## Verificación constitucional

*Puerta obligatoria antes de la Fase 0 y reevaluación después del diseño.*

- **I. Dominio tipado**: ¿la funcionalidad cambia `src/lib/types.ts`? Si sí, ¿se
  actualizan `validation.ts`, datos de ejemplo y pruebas manuales?
- **II. Persistencia**: ¿el cambio altera el formato de `taskboard:v2`? Si sí,
  ¿hay migración o nueva versión de clave documentada? ¿Sigue funcionando sin
  Supabase?
- **III. Accesibilidad/UI**: ¿es operable con teclado, anuncia cambios y respeta
  español, responsive y temas?
- **IV. Componentes/fronteras**: ¿reutiliza `src/components/ui/` y mantiene
  `"use client"` solo donde hace falta?
- **V. Verificación**: ¿el plan incluye las tres puertas y el QA manual?
- **VI. Alcance**: ¿evita dependencias nuevas innecesarias y mantiene el alcance
  sin backend propio? ¿Cualquier servicio externo está autorizado por la
  constitución y tiene fallback local?

Cualquier violación MUST justificarse en la sección "Complejidad justificada" o
rechazarse antes de continuar.

## Estructura del proyecto

### Documentación de la funcionalidad

```text
specs/[###-nombre]/
├── spec.md              # Especificación (entrada)
├── plan.md              # Este archivo (/speckit.plan)
├── research.md          # Fase 0: decisiones e investigación (/speckit.plan)
├── data-model.md        # Fase 1: modelo de datos (/speckit.plan)
├── contracts/           # Fase 1: solo si hay contratos o formatos externos
├── quickstart.md        # Fase 1: guía de prueba manual (/speckit.plan)
└── tasks.md             # Fase 2: tareas (/speckit.tasks)
```

### Código fuente (raíz del repositorio)

```text
src/
├── app/
│   ├── layout.tsx           # tema, toasts, tooltips y metadatos
│   ├── page.tsx             # monta el tablero
│   └── globals.css          # Tailwind 4 y tokens de shadcn
├── components/
│   ├── board/               # tablero, columnas, tarjetas, toolbar, métricas
│   ├── tasks/               # diálogos, formulario, etiquetas y fecha límite
│   ├── ui/                  # componentes shadcn/ui reutilizables
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── hooks/
│   └── use-hydrated.ts      # evita desajustes de hidratación con localStorage
├── lib/
│   ├── constants.ts         # configuración visual, límites y filtros
│   ├── seed.ts              # datos de ejemplo
│   ├── task-utils.ts        # filtros, orden, estadísticas y movimientos
│   ├── types.ts             # modelo de dominio
│   ├── utils.ts             # utilidades de clases y helpers
│   └── validation.ts        # esquemas Zod
└── store/
    └── task-store.ts        # estado global con persistencia

public/                      # recursos estáticos
```

## Fases de implementación

### Fase 0: Investigación (`research.md`)

- Resolver cada `[NEEDS CLARIFICATION]` de la especificación.
- Confirmar los archivos exactos que se modifican y los que no.
- Identificar riesgos de hidratación, persistencia o accesibilidad.
- Documentar alternativas descartadas y por qué.

### Fase 1: Diseño (`data-model.md`, `quickstart.md`, `contracts/`)

- Describir los cambios de modelo (campos, estados, validaciones y migración).
- Definir el flujo de datos: formulario → Zod → store → `persist` → UI.
- Incluir `quickstart.md` con pasos manuales concretos para probar la
  funcionalidad, incluidos los casos límite de la especificación.
- Añadir `contracts/` solo si hay un formato externo relevante (por ejemplo, una
  nueva versión del JSON de importación/exportación).

### Fase 2: Tareas (`tasks.md`)

- Generar tareas ordenadas por dependencia y por historia de usuario.
- Incluir rutas exactas de archivos y criterios de aceptación.
- Terminar siempre con la fase de verificación:

```bash
pnpm lint
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm build
```

Y el QA manual correspondiente (ver abajo).

## Comandos de verificación

| Comando | Cuándo | Resultado esperado |
| --- | --- | --- |
| `pnpm lint` | Después de cada bloque de cambios | Sin errores ni warnings nuevos |
| `pnpm exec next typegen` | Antes de comprobar tipos | Tipos de rutas generados |
| `pnpm exec tsc --noEmit` | Después de tocar tipos, props o validación | Sin errores de tipos |
| `pnpm build` | Antes de cerrar la funcionalidad | Build de producción correcto |
| `pnpm dev` | Durante el QA manual | Tablero funcional en `localhost:3000` |

### QA manual mínimo

- Crear, editar, duplicar y eliminar una tarea; comprobar deshacer.
- Mover tareas entre columnas y reordenarlas con ratón, táctil y teclado.
- Recargar y comprobar que tareas, orden y estado se conservan.
- Abrir dos pestañas y comprobar la sincronización por el evento `storage`.
- Exportar a JSON, limpiar el tablero e importar la copia.
- Probar búsqueda, filtros por prioridad/etiqueta/vencimiento y orden.
- Revisar móvil (carrusel), tableta y escritorio; temas claro, oscuro y sistema.
- Navegar solo con teclado y comprobar foco, anuncios ARIA y menú "Mover a".

## Riesgos y mitigaciones

- **Desajuste de hidratación**: leer `localStorage` solo tras el montaje y usar
  `useHydrated`; no renderizar datos persistidos en el servidor.
- **Pérdida o corrupción de datos**: validar con Zod antes de escribir; migrar
  o versionar la clave si el formato cambia; nunca borrar datos ante un error de
  importación.
- **Regresión de arrastrar y soltar**: mantener la alternativa "Mover a" y probar
  ratón, táctil y teclado en cada cambio del tablero.
- **Dependencia nueva innecesaria**: justificarla en "Complejidad justificada" y
  preferir utilidades existentes (`task-utils`, `constants`, `ui/`).
- **Build de Vercel roto**: ejecutar `pnpm build` localmente antes de integrar a
  `master`.

## Complejidad justificada

[Si alguna decisión viola un principio de la constitución, explica aquí la
necesidad, el impacto y la alternativa descartada. Si no hay violaciones, escribe
"Sin violaciones: el plan cumple la constitución v1.0.0".]

## Seguimiento

- [ ] Especificación clarificada y sin `[NEEDS CLARIFICATION]` pendientes.
- [ ] Verificación constitucional aprobada.
- [ ] `tasks.md` generado con la fase de verificación incluida.
- [ ] `pnpm lint`, `pnpm exec next typegen` + `pnpm exec tsc --noEmit` y
  `pnpm build` en verde.
- [ ] QA manual completado y documentado en el PR o commit.
