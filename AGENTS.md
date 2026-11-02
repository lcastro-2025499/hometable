<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Spec-Driven Development (SDD)

Este repositorio usa GitHub Spec Kit 1.2.6 con OpenCode y la metodología
Spec-Driven Development. Antes de implementar una funcionalidad:

1. Lee la constitución del proyecto en `.specify/memory/constitution.md`; es la
   autoridad si hay conflicto con otras prácticas.
2. Sigue el flujo: `/speckit.specify` → `/speckit.clarify` (opcional) →
   `/speckit.plan` → `/speckit.tasks` → `/speckit.analyze` → `/speckit.implement`.
3. Trabaja sobre la especificación de `specs/NNN-nombre/` (spec, plan, tasks y
   artefactos de diseño). No implementes sin plan y tareas aprobados.

Reglas del proyecto:

- Las plantillas efectivas están en `.specify/templates/overrides/` y están
  adaptadas a Hometable; no edites las plantillas core de `.specify/templates/`.
- La UI y todos los documentos SDD se escriben en español.
- El producto es una SPA sin backend: persistencia en `localStorage`
  (`taskboard:v1`), sin cuentas ni sincronización entre dispositivos.
- Reutiliza `src/components/ui/`, `src/lib/task-utils.ts` y
  `src/store/task-store.ts` antes de crear alternativas.
- Puertas obligatorias antes de integrar: `pnpm lint`, `pnpm exec next typegen` +
  `pnpm exec tsc --noEmit`, `pnpm build` y el QA manual descrito en el plan.
- La extensión `git` de Spec Kit crea la rama `NNN-nombre` antes de
  `/speckit.specify`; `master` debe permanecer desplegable en Vercel.

