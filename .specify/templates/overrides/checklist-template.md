# [TIPO DE CHECKLIST] Checklist: [NOMBRE DE LA FUNCIONALIDAD]

**Propósito**: [Describe qué cubre esta checklist y por qué es importante para
Hometable.]

**Creada**: [FECHA]

**Funcionalidad**: [Enlace a `spec.md` o documentación relevante]

**Nota**: Esta checklist la genera `/speckit.checklist` a partir del contexto y
los requisitos de la funcionalidad. Es una revisión de la **calidad de los
requisitos**, no una prueba de implementación.

**Responsable de la revisión**: quien revise debe marcar `[x]` solo cuando el
criterio de calidad esté realmente satisfecho.

**Semántica de las marcas**: `[x]` significa "criterio revisado y satisfecho";
no significa que la implementación esté terminada.

<!--
  Sustituye los ejemplos por criterios concretos de la funcionalidad. Cada
  criterio debe poder responderse con "sí" o "no" y debe referirse a la
  especificación, no al código.
-->

## Requisitos y alcance

- [ ] CHK001 ¿Cada historia de usuario tiene prioridad (P1/P2/P3) y una prueba
  independiente clara?
- [ ] CHK002 ¿Cada requisito funcional es verificable y usa MUST/SHOULD sin
  ambigüedades?
- [ ] CHK003 ¿Los casos límite cubren tablero vacío, límites de texto, fechas,
  importación inválida y recarga?
- [ ] CHK004 ¿La especificación declara explícitamente lo que queda fuera de
  alcance (backend, cuentas, sincronización)?
- [ ] CHK005 ¿Los criterios de éxito son medibles y no dependen de detalles de
  implementación?

## Accesibilidad y experiencia

- [ ] CHK006 ¿La funcionalidad se puede completar solo con teclado y con foco
  visible en todo momento?
- [ ] CHK007 ¿Se especifica qué se anuncia por ARIA live al mover, crear o
  eliminar una tarea?
- [ ] CHK008 ¿Existe una alternativa al arrastre (menú "Mover a") y está descrita
  en los requisitos?
- [ ] CHK009 ¿Los controles nuevos tienen nombre accesible y estados de error
  comprensibles?
- [ ] CHK010 ¿Se contempla el uso táctil además de ratón y teclado?

## Persistencia y datos

- [ ] CHK011 ¿El requisito indica si el cambio altera el formato de
  `taskboard:v1`?
- [ ] CHK012 Si el formato cambia, ¿hay una estrategia de migración o nueva
  versión de clave documentada?
- [ ] CHK013 ¿Se especifica qué datos se persisten (solo tareas) y cuáles no
  (filtros, orden visual, tema)?
- [ ] CHK014 ¿La importación inválida o duplicada deja intactos los datos
  existentes?
- [ ] CHK015 ¿La exportación produce un JSON que puede reimportarse sin pérdida?

## Responsive y temas

- [ ] CHK016 ¿Se describen los comportamientos esperados en móvil (carrusel),
  tableta y escritorio?
- [ ] CHK017 ¿La funcionalidad respeta los temas claro, oscuro y sistema sin
  colores hardcodeados?
- [ ] CHK018 ¿Los estados de carga usan el esqueleto del tablero y no provocan
  saltos de contenido?

## Idioma y contenido

- [ ] CHK019 ¿Todos los textos nuevos están en español y son coherentes con el
  resto de la interfaz?
- [ ] CHK020 ¿Los mensajes de error y confirmación explican qué pasó y qué puede
  hacer el usuario?
- [ ] CHK021 ¿Las fechas se muestran y se introducen con el formato y el locale
  `es` existentes?

## Verificación y entrega

- [ ] CHK022 ¿El plan incluye `pnpm lint`, `pnpm exec next typegen` +
  `pnpm exec tsc --noEmit` y `pnpm build` como puertas obligatorias?
- [ ] CHK023 ¿El plan incluye QA manual para arrastrar y soltar, persistencia,
  multi-pestaña, exportación/importación y accesibilidad?
- [ ] CHK024 ¿Se identifican los archivos exactos que se modifican y los que no?
- [ ] CHK025 ¿Se justifica cualquier dependencia nueva o se evita?
- [ ] CHK026 ¿La entrega deja `master` desplegable en Vercel?

## Regresión

- [ ] CHK027 ¿Se enumeran las funciones existentes que no deben romperse
  (búsqueda, filtros, orden, undo, importar/exportar, métricas)?
- [ ] CHK028 ¿Cada caso límite de la especificación tiene una prueba manual o un
  test asociado?
- [ ] CHK029 ¿La funcionalidad mantiene el rendimiento con cientos de tareas?
- [ ] CHK030 ¿Los cambios de modelo actualizan tipos, validación, datos de
  ejemplo y documentación en la misma entrega?
