-- Contadores de rate limit para los endpoints públicos de autenticación.
-- Una fila por clave (ruta + IP + identificador) y ventana temporal.

begin;

create table if not exists public.auth_rate_limit (
  key text primary key,
  window_started_at timestamptz not null default now(),
  count integer not null default 0,
  constraint auth_rate_limit_count_non_negative check (count >= 0)
);

create index if not exists idx_auth_rate_limit_window
  on public.auth_rate_limit (window_started_at);

alter table public.auth_rate_limit enable row level security;
revoke all on table public.auth_rate_limit from anon, authenticated, public;

commit;
