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
- El producto es una aplicación web full-stack con Next.js App Router: autenticación obligatoria con **Better Auth** (adaptador PostgreSQL conectado a Supabase), persistencia y sincronización multi-dispositivo vía Supabase.
- La fuente de verdad del esquema es
  `supabase/migrations/20261109000000_align_tasks_schema.sql` y las migraciones de Better Auth. Incluye tablas de usuario, sesiones, cuentas, verificación, tareas con `owner_id`, índices, RLS y publicación Realtime.
- Se usan variables públicas (`NEXT_PUBLIC_*`) en el cliente y claves privadas en el servidor (`BETTER_AUTH_SECRET`, `RECAPTCHA_SECRET_KEY`, `RESEND_API_KEY`). Nunca expongas secretos; documenta las variables en `.env.example` y mantén `.env.local` fuera de git.

## Reglas de commits y seguridad:

- **Nomenclatura y tamaño de commits**: Usar formato Conventional Commits en inglés (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`). **Hacer commits pequeños y frecuentes** (habitualmente un commit por cada modificación o tarea atómica importante; nunca mezclar refactorings masivos, cambios de docs y fixes en un solo commit grande).
- Reutiliza `src/components/ui/`, `src/lib/task-utils.ts` y
  `src/store/task-store.ts` antes de crear alternativas.
- Puertas obligatorias antes de integrar: `pnpm lint`, `pnpm exec next typegen` +
  `pnpm exec tsc --noEmit`, `pnpm build` y el QA manual descrito en el plan.
- La extensión `git` de Spec Kit crea la rama `NNN-nombre` antes de
  `/speckit.specify`; `master` debe permanecer desplegable en Vercel.

