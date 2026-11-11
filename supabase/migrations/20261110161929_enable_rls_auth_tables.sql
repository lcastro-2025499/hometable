-- Historial remoto: RLS en las tablas de Better Auth.
--
-- Estas tablas solo las usa el servidor a través de la conexión directa a
-- Postgres. RLS sin políticas y sin grants equivale a denegar el acceso a los
-- roles públicos de PostgREST. `lock_down_tasks` vuelve a revocar los permisos
-- como defensa en profundidad.

begin;

alter table public."user" enable row level security;
alter table public.session enable row level security;
alter table public.account enable row level security;
alter table public.verification enable row level security;

revoke all on table public."user" from anon, authenticated, public;
revoke all on table public.session from anon, authenticated, public;
revoke all on table public.account from anon, authenticated, public;
revoke all on table public.verification from anon, authenticated, public;

commit;
