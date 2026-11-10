-- Bloquea por completo el acceso de los roles públicos (anon/authenticated) a
-- las tareas. Desde ahora el CRUD de tareas vive en el servidor de Next.js,
-- que valida la sesión de Better Auth y usa la conexión directa a Postgres.
--
-- Con RLS activo, sin políticas y sin GRANTs, la anon key pública deja de ser
-- útil para leer, insertar, actualizar o borrar tareas de cualquier usuario.

begin;

-- Políticas heredadas del modo invitado.
drop policy if exists "public select" on public.tasks;
drop policy if exists "public insert" on public.tasks;
drop policy if exists "public update" on public.tasks;
drop policy if exists "public delete" on public.tasks;

alter table public.tasks enable row level security;
alter table public.board enable row level security;

-- Defensa en profundidad: aunque RLS ya bloquea, retiramos también los
-- privilegios de tabla de los roles expuestos por PostgREST.
revoke all on table public.tasks from anon, authenticated;
revoke all on table public.board from anon, authenticated;
revoke all on table public.tasks from public;
revoke all on table public.board from public;

-- Las tablas de Better Auth ya tenían RLS activo; retiramos los privilegios
-- residuales para que el cliente nunca pueda tocarlas.
revoke all on table public."user" from anon, authenticated;
revoke all on table public.session from anon, authenticated;
revoke all on table public.account from anon, authenticated;
revoke all on table public.verification from anon, authenticated;

-- Realtime dejó de ser necesario: la app sincroniza por la API autenticada.
do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tasks'
  ) then
    alter publication supabase_realtime drop table public.tasks;
  end if;
end
$$;

commit;
