-- Endurecimiento final del modelo de tareas:
--   * `owner_id` deja de ser nullable: toda tarea pertenece a una cuenta.
--   * Se indexa la FK de `board.owner_id` para el futuro multi-tablero.
--
-- Requiere que no existan tareas huérfanas. La aplicación siempre deriva el
-- dueño de la sesión y el proyecto remoto se verificó sin filas con
-- `owner_id is null` antes de aplicar esta migración.

begin;

alter table public.tasks alter column owner_id set not null;

create index if not exists idx_board_owner_id on public.board (owner_id);

commit;
