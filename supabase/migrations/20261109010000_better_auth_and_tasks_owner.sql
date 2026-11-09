-- Actualiza la tabla public.tasks para usar owner_id como text referencing public."user"(id)
-- y prepara la tabla public.board para soporte futuro multi-tablero.

begin;

-- Cambia owner_id de uuid a text para alinearse con Better Auth user.id
alter table public.tasks drop constraint if exists tasks_owner_id_fkey;
alter table public.tasks alter column owner_id type text using owner_id::text;

-- Agrega la FK apuntando a la tabla user de Better Auth
alter table public.tasks
  add constraint tasks_owner_id_user_fkey
  foreign key (owner_id) references public."user"(id) on delete cascade;

create index if not exists idx_tasks_owner_id on public.tasks (owner_id);

-- Tabla board preparada para futuro soporte multi-tablero (máximo 2 tableros por usuario)
create table if not exists public.board (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id text not null references public."user"(id) on delete cascade,
  type text not null default 'personal' check (type in ('personal', 'invited')),
  created_at timestamptz not null default now()
);

alter table public.tasks
  add column if not exists board_id uuid references public.board(id) on delete cascade;

create index if not exists idx_tasks_board_id on public.tasks (board_id);

grant select, insert, update, delete on table public.board to anon, authenticated;

commit;
