-- Realtime autenticado para las tareas del propio usuario.
--
-- El navegador recibe un JWT corto firmado por el servidor de Next.js con el
-- secreto del proyecto. Ese JWT lleva `sub = user.id` y `role = authenticated`,
-- de modo que RLS puede limitar los eventos a las tareas propias.
--
-- Las escrituras siguen revocadas: el CRUD pasa por /api/tasks.

begin;

alter table public.tasks enable row level security;

-- Necesario para que los eventos DELETE incluyan el dueño y RLS pueda filtrar.
alter table public.tasks replica identity full;

revoke all on table public.tasks from anon;
revoke all on table public.tasks from public;
revoke insert, update, delete on table public.tasks from authenticated;

-- Solo lectura de las filas propias. `owner_id` es text (Better Auth), así que
-- no sirve auth.uid(): se compara contra el claim `sub` del JWT.
grant select on table public.tasks to authenticated;

drop policy if exists "realtime select own tasks" on public.tasks;
create policy "realtime select own tasks"
  on public.tasks
  for select
  to authenticated
  using (owner_id = (auth.jwt() ->> 'sub'));

-- Publicación de Realtime (idempotente).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end
$$;

commit;
