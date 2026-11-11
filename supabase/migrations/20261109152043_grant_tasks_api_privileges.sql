-- Historial remoto: privilegios de tabla para los roles expuestos por
-- PostgREST. Se mantiene para que `supabase migration list` coincida con el
-- proyecto y para que una base nueva reproduzca la secuencia completa.
--
-- La migración `lock_down_tasks` revoca estos permisos más adelante: el CRUD
-- real vive en /api/tasks y usa la conexión directa a Postgres.

begin;

grant select, insert, update, delete on table public.tasks to anon, authenticated;

commit;
