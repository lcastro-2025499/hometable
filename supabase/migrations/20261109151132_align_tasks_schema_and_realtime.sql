-- Alinea la tabla pública `tasks` con el modelo de la aplicación, habilita
-- Supabase Realtime para INSERT/UPDATE/DELETE y deja el esquema reproducible
-- desde un proyecto vacío.

begin;

create extension if not exists "pgcrypto";

-- Tabla base. En proyectos existentes no cambia nada; en uno nuevo crea todo.
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'todo',
  priority text not null default 'low',
  due_date date,
  tags text[] not null default '{}',
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

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

-- `updated_at` se actualiza en el servidor en cada UPDATE. El cliente también
-- envía su marca para conservar el orden de cambios durante la reconciliación.
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_tasks_updated_at on public.tasks;
create trigger update_tasks_updated_at
  before update on public.tasks
  for each row
  execute function public.update_updated_at_column();

-- Índices que faltaban respecto al modelo documentado.
create index if not exists idx_tasks_status on public.tasks (status);
create index if not exists idx_tasks_order on public.tasks ("order");
create index if not exists idx_tasks_due_date on public.tasks (due_date);
create index if not exists idx_tasks_status_order on public.tasks (status, "order");

-- Modo invitado del MVP: lectura y escritura públicas. En el futuro estas
-- políticas se restringirán a `auth.uid() = owner_id`.
alter table public.tasks enable row level security;

drop policy if exists "public select" on public.tasks;
create policy "public select" on public.tasks for select using (true);

drop policy if exists "public insert" on public.tasks;
create policy "public insert" on public.tasks for insert with check (true);

drop policy if exists "public update" on public.tasks;
create policy "public update" on public.tasks for update using (true);

drop policy if exists "public delete" on public.tasks;
create policy "public delete" on public.tasks for delete using (true);

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
