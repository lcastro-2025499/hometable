-- Tablas de Better Auth y vínculo de las tareas con su dueño.
--
-- Esta migración es la base reproducible del esquema de autenticación. Antes
-- de ella solo existían las tablas creadas a mano en el proyecto remoto, así
-- que un `supabase db push` desde cero fallaba al referenciar public."user".
--
-- Es idempotente: en el proyecto actual las tablas ya existen y los `create
-- table if not exists` no hacen nada; en una base nueva lo crean todo.

begin;

-- ---------------------------------------------------------------------------
-- Better Auth: user, session, account y verification
-- ---------------------------------------------------------------------------
-- Los nombres de tabla y columna usan camelCase porque el adaptador `pg` de
-- Better Auth los cita literalmente. `firstName` y `lastName` son campos
-- adicionales declarados en src/lib/auth.ts; `username` y `displayUsername`
-- vienen del plugin `username`.

create table if not exists public."user" (
  id text primary key,
  name text not null,
  email text not null,
  "emailVerified" boolean not null default false,
  image text,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null default current_timestamp,
  username text,
  "displayUsername" text,
  "firstName" text not null,
  "lastName" text not null,
  constraint user_email_key unique (email),
  constraint user_username_key unique (username)
);

create table if not exists public.session (
  id text primary key,
  "expiresAt" timestamptz not null,
  token text not null,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null default current_timestamp,
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null,
  constraint session_token_key unique (token),
  constraint session_userId_fkey
    foreign key ("userId") references public."user"(id) on delete cascade
);

create index if not exists session_userId_idx on public.session ("userId");

create table if not exists public.account (
  id text primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null default current_timestamp,
  constraint account_userId_fkey
    foreign key ("userId") references public."user"(id) on delete cascade
);

create index if not exists account_userId_idx on public.account ("userId");

create table if not exists public.verification (
  id text primary key,
  identifier text not null,
  value text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null default current_timestamp
);

create index if not exists verification_identifier_idx
  on public.verification (identifier);

-- ---------------------------------------------------------------------------
-- Tareas: owner_id pasa de uuid (auth.users) a text (Better Auth user.id)
-- ---------------------------------------------------------------------------

alter table public.tasks drop constraint if exists tasks_owner_id_fkey;
alter table public.tasks alter column owner_id type text using owner_id::text;

-- Idempotente: en el proyecto remoto la restricción ya existía.
alter table public.tasks drop constraint if exists tasks_owner_id_user_fkey;
alter table public.tasks
  add constraint tasks_owner_id_user_fkey
  foreign key (owner_id) references public."user"(id) on delete cascade;

create index if not exists idx_tasks_owner_id on public.tasks (owner_id);

-- ---------------------------------------------------------------------------
-- Tablero preparado para el futuro multi-tablero (máximo 2 por usuario)
-- ---------------------------------------------------------------------------

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
