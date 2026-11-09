-- Alinea la tabla pública `tasks` con el modelo de la aplicación y habilita
-- Supabase Realtime para los cambios INSERT/UPDATE/DELETE.

begin;

-- `description` es opcional en la app y `title` siempre se envía.
alter table public.tasks alter column title drop default;
alter table public.tasks alter column description drop not null;
alter table public.tasks alter column description drop default;

-- `order` es un entero pequeño; en Supabase quedó como bigint.
alter table public.tasks alter column "order" type integer using "order"::integer;

-- `tags` siempre debe ser un array, aunque esté vacío.
update public.tasks set tags = '{}' where tags is null;
alter table public.tasks alter column tags set default '{}';
alter table public.tasks alter column tags set not null;

-- Preparación para autenticación futura sin romper el modo invitado.
alter table public.tasks
  add column if not exists owner_id uuid references auth.users(id) on delete set null;

-- Restricciones que validan el dominio también en la base de datos.
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks
  add constraint tasks_status_check check (status in ('todo', 'in_progress', 'done'));

alter table public.tasks drop constraint if exists tasks_priority_check;
alter table public.tasks
  add constraint tasks_priority_check check (priority in ('low', 'medium', 'high', 'urgent'));

alter table public.tasks drop constraint if exists tasks_due_date_check;
alter table public.tasks
  add constraint tasks_due_date_check check (due_date is null or due_date >= date '1970-01-01');

-- Índices que faltaban respecto al modelo documentado.
create index if not exists idx_tasks_due_date on public.tasks (due_date);
create index if not exists idx_tasks_status_order on public.tasks (status, "order");

-- Supabase Realtime solo emite cambios de tablas incluidas en la publicación.
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

-- RLS filtra las filas, pero los roles del cliente necesitan privilegios
-- explícitos sobre la tabla para poder usar la API REST y Realtime.
grant select, insert, update, delete on table public.tasks to anon, authenticated;

commit;
