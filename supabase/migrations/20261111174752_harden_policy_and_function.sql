-- Endurecimiento de la policy de Realtime y del trigger de `updated_at`.
--
-- 1. `auth.jwt()` se evalúa una vez por fila en la policy; envolver la llamada
--    en una subconsulta permite a Postgres inicializarla una sola vez por
--    sentencia (aviso `auth_rls_initplan` de los advisors). El envoltorio debe
--    cubrir `auth.jwt()` y no la expresión completa, que es lo que reconoce el
--    planner.
-- 2. El trigger usaba `now()` con el `search_path` heredado de la sesión; se
--    fija vacío y se llama a `pg_catalog.now()` de forma explícita (aviso
--    `function_search_path_mutable`).
--
-- Sin cambios de comportamiento: `owner_id` sigue siendo text y el claim `sub`
-- también.

begin;

drop policy if exists "realtime select own tasks" on public.tasks;
create policy "realtime select own tasks"
  on public.tasks
  for select
  to authenticated
  using (owner_id = ((select auth.jwt()) ->> 'sub'));

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

commit;
