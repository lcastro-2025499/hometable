-- Índices alineados con las consultas reales del tablero.
--
-- Todas las lecturas filtran por dueño y ordenan por estado + posición o por
-- fecha de creación. Los índices globales anteriores ya no sirven: sin
-- `owner_id` como primera columna el planner no puede usarlos para una cuenta.

begin;

create index if not exists idx_tasks_owner_status_order
  on public.tasks (owner_id, status, "order");

create index if not exists idx_tasks_owner_created_at
  on public.tasks (owner_id, created_at desc);

-- Reemplazados por los índices compuestos anteriores.
drop index if exists public.idx_tasks_owner_id;
drop index if exists public.idx_tasks_status;
drop index if exists public.idx_tasks_order;
drop index if exists public.idx_tasks_due_date;
drop index if exists public.idx_tasks_status_order;

commit;
