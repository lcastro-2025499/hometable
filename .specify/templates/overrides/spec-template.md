# Especificación de funcionalidad: [NOMBRE DE LA FUNCIONALIDAD]

**Directorio**: `specs/[###-nombre]`

**Fecha**: [FECHA]

**Estado**: Borrador

**Entrada**: Descripción del usuario: "[DESCRIPCIÓN ORIGINAL]"

## Contexto del producto

Hometable es un tablero Kanban personal que funciona completamente en el navegador:

- Tres columnas: **Pendiente**, **En progreso** y **Hecha**.
- Las tareas se crean, editan, duplican, eliminan (con deshacer) y mueven entre
  columnas o dentro de una columna mediante arrastrar y soltar.
- Cada tarea tiene título, descripción, prioridad, etiquetas, fecha límite y
  orden manual. El tablero muestra métricas y permite buscar, filtrar y ordenar.
- La persistencia base es local (`localStorage`, clave `taskboard:v2`); la
  sincronización multi-dispositivo con Supabase es opcional. No hay backend propio
  ni cuentas. Existe exportación e importación de copias de seguridad en JSON.
- La interfaz está en español, es responsive (carrusel por columna en móvil),
  soporta temas claro/oscuro/sistema y es operable con ratón, táctil y teclado.
- Stack: Next.js 16 (App Router), React 19, TypeScript estricto, Tailwind CSS 4,
  shadcn/ui, Zustand 5 con `persist`, Zod 4, React Hook Form, dnd-kit, date-fns
  con locale `es`, sonner y next-themes.

Toda funcionalidad nueva MUST respetar la constitución del proyecto
(`.specify/memory/constitution.md`) y encajar en este contexto sin introducir
backend propio. Los servicios externos gratuitos (por ejemplo Supabase) solo se
permiten si la constitución los autoriza y la funcionalidad sigue funcionando en
modo local.

## Escenarios de usuario y pruebas (obligatorio)

<!--
  Guía:
  - Ordena las historias por importancia (P1, P2, P3...). P1 es el MVP.
  - Cada historia debe poder implementarse, probarse y demostrarse por separado.
  - Si no hay un flujo de usuario claro, detente y pide aclaración.
-->

### Historia de usuario 1 - [TÍTULO BREVE] (Prioridad: P1)

[Describe la interacción del usuario en lenguaje llano.]

**Por qué esta prioridad**: [Valor que aporta y por qué es la más crítica.]

**Prueba independiente**: [Cómo se demuestra esta historia por sí sola, por
ejemplo: "Con el tablero vacío, crear una tarea y verla en Pendiente sin
recargar".]

**Escenarios de aceptación**:

1. **Dado** [estado inicial], **Cuando** [acción], **Entonces** [resultado esperado].
2. **Dado** [estado inicial], **Cuando** [acción], **Entonces** [resultado esperado].

---

### Historia de usuario 2 - [TÍTULO BREVE] (Prioridad: P2)

[Describe la interacción del usuario en lenguaje llano.]

**Por qué esta prioridad**: [Valor que aporta.]

**Prueba independiente**: [Cómo se demuestra esta historia por sí sola.]

**Escenarios de aceptación**:

1. **Dado** [estado inicial], **Cuando** [acción], **Entonces** [resultado esperado].

---

### Historia de usuario 3 - [TÍTULO BREVE] (Prioridad: P3)

[Describe la interacción del usuario en lenguaje llano.]

**Por qué esta prioridad**: [Valor que aporta.]

**Prueba independiente**: [Cómo se demuestra esta historia por sí sola.]

**Escenarios de aceptación**:

1. **Dado** [estado inicial], **Cuando** [acción], **Entonces** [resultado esperado].

---

[Añade más historias si son necesarias, siempre con prioridad asignada.]

## Casos límite

<!--
  Acción requerida: sustituye estos ejemplos por los casos reales de la
  funcionalidad. Piensa en datos vacíos, límites, errores y estados intermedios.
-->

- ¿Qué ocurre con el tablero vacío o con una columna sin tareas?
- ¿Qué ocurre al recargar, abrir otra pestaña o limpiar el almacenamiento?
- ¿Qué ocurre con títulos, descripciones o etiquetas en los límites permitidos
  (`120` caracteres de título, `1000` de descripción, `8` etiquetas de `24`)?
- ¿Qué ocurre si la fecha límite es hoy, está vencida o no existe?
- ¿Qué ocurre al importar un JSON inválido, incompleto o con IDs duplicados?
- ¿Qué ocurre al usar solo teclado o un lector de pantalla?
- ¿Qué ocurre en móvil, con el tema oscuro y con el sistema en modo claro?

## Requisitos (obligatorio)

### Requisitos funcionales

<!-- Cada requisito MUST ser verificable. Usa MUST/SHOULD y evita ambigüedades. -->

- **RF-001**: El sistema MUST [capacidad concreta].
- **RF-002**: El sistema MUST [capacidad concreta].
- **RF-003**: El usuario MUST poder [interacción concreta].
- **RF-004**: El sistema MUST [comportamiento de persistencia o datos].
- **RF-005**: El sistema MUST [comportamiento de accesibilidad o error].

Si un requisito no puede definirse todavía, usa el marcador técnico
`[NEEDS CLARIFICATION: pregunta concreta en español]` (máximo 3 en toda la
especificación) y explica el impacto de cada decisión pendiente.

### Requisitos no funcionales

- **RNF-001 (Accesibilidad)**: La funcionalidad MUST ser operable con teclado,
  anunciar los cambios relevantes con ARIA live y mantener el foco visible.
- **RNF-002 (Persistencia)**: Los cambios MUST sobrevivir a una recarga y MUST
  respetar el formato `taskboard:v2`; cualquier cambio incompatible requiere
  migración documentada. La sincronización con Supabase es opcional y nunca puede
  romper el modo local.
- **RNF-003 (Responsive)**: La funcionalidad MUST funcionar en móvil, tableta y
  escritorio sin romper el carrusel por columna.
- **RNF-004 (Rendimiento)**: La interacción MUST sentirse inmediata con cientos
  de tareas; evita renders o recorridos innecesarios del tablero completo.
- **RNF-005 (Idioma)**: Todo texto nuevo MUST estar en español y ser coherente
  con el resto de la interfaz.
- **RNF-006 (Temas)**: La funcionalidad MUST respetar los temas claro, oscuro y
  sistema sin colores hardcodeados fuera de los tokens existentes.

### Entidades clave

- **Task**: tarea del tablero con `id`, `title`, `description`, `status`,
  `priority`, `dueDate`, `tags`, `order`, `createdAt`, `updatedAt` y
  `completedAt`.
- **Estado**: `todo`, `in_progress` o `done`.
- **Prioridad**: `low`, `medium`, `high` o `urgent`.
- **Etiqueta**: texto libre normalizado, sin duplicados y con límite de `8`.
- **Filtros**: búsqueda por texto, prioridad, etiqueta, vencimiento y orden.

## Criterios de éxito (obligatorio)

<!-- Deben ser medibles y agnósticos a la implementación. -->

### Resultados medibles

- **CE-001**: [Métrica verificable, por ejemplo: "Una tarea creada aparece en la
  columna correcta en menos de 1 segundo, sin recargar".]
- **CE-002**: [Métrica verificable, por ejemplo: "Tras recargar, el 100% de las
  tareas y su orden se conservan".]
- **CE-003**: [Métrica verificable, por ejemplo: "La funcionalidad completa se
  puede usar solo con teclado"]. 
- **CE-004**: [Métrica de regresión, por ejemplo: "Las funciones existentes de
  búsqueda, filtros, exportación e importación siguen funcionando".]

## Supuestos

- [Supuesto sobre el usuario o el entorno, por ejemplo: "El usuario usa un
  navegador moderno con `localStorage` disponible".]
- [Supuesto sobre datos existentes, por ejemplo: "Las tareas actuales ya cumplen
  el modelo de `src/lib/types.ts`".]
- [Dependencia interna, por ejemplo: "Se reutilizan los componentes de
  `src/components/ui/` y los helpers de `src/lib/task-utils.ts`".]

## Fuera de alcance

- Cuentas de usuario, autenticación y sincronización entre dispositivos.
- Backend, API propia, base de datos o servicios externos.
- Colaboración en tiempo real y notificaciones push.
- Cambios de stack, de framework de estilos o del formato de persistencia sin
  enmienda constitucional.

## Glosario

- **Tablero**: vista principal con las tres columnas y sus tarjetas.
- **Columna**: agrupación por estado (`Pendiente`, `En progreso`, `Hecha`).
- **Tarjeta**: representación visual de una `Task`.
- **Arrastrar y soltar**: interacción de movimiento con ratón, táctil o teclado.
- **Copia de seguridad**: archivo JSON exportado que puede reimportarse.
