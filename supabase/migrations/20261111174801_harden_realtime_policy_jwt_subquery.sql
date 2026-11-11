-- Historial remoto: la policy de Realtime pasa a evaluar `auth.jwt()` dentro
-- de una subconsulta para que el planner la inicialice una vez por sentencia.
--
-- Es idempotente y deja exactamente la misma policy que
-- `harden_policy_and_function`: sin cambios de comportamiento.

begin;

drop policy if exists "realtime select own tasks" on public.tasks;

create policy "realtime select own tasks"
  on public.tasks
  for select
  to authenticated
  using (owner_id = ((select auth.jwt()) ->> 'sub'));

commit;
