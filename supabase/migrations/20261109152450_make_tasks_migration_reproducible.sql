-- Historial remoto: ajustes idempotentes que hicieron reproducible el esquema
-- de `tasks` desde un proyecto vacío.
--
-- No cambia el estado final; agrupa las guardas que antes se ejecutaron a mano
-- en el SQL Editor para que una base nueva no falle al repetir la migración.

begin;

alter table public.tasks
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

alter table public.tasks alter column description drop not null;
alter table public.tasks alter column tags set default '{}';
update public.tasks set tags = '{}' where tags is null;
alter table public.tasks alter column tags set not null;

alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks
  add constraint tasks_status_check check (status in ('todo', 'in_progress', 'done'));

alter table public.tasks drop constraint if exists tasks_priority_check;
alter table public.tasks
  add constraint tasks_priority_check check (priority in ('low', 'medium', 'high', 'urgent'));

alter table public.tasks drop constraint if exists tasks_due_date_check;
alter table public.tasks
  add constraint tasks_due_date_check
  check (due_date is null or due_date >= date '1970-01-01');

-- La función y el trigger se redefinen con `create or replace` / `drop` para
-- que repetir la migración sea seguro.
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

drop trigger if exists update_tasks_updated_at on public.tasks;
create trigger update_tasks_updated_at
  before update on public.tasks
  for each row
  execute function public.update_updated_at_column();

commit;
