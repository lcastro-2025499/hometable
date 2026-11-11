-- Registros pendientes de verificación.
--
-- La cuenta de Better Auth ya no se crea al enviar el formulario de registro:
-- se guarda aquí un registro temporal (contraseña ya hasheada y código OTP
-- hasheado) y solo cuando el usuario confirma el código se crea la fila en
-- public."user" + public.account. Así un correo mal escrito o un registro
-- abandonado no bloquea el email/username ni ocupa una cuenta real.

begin;

create table if not exists public.pending_registration (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  username text not null,
  display_username text not null,
  name text not null,
  first_name text not null,
  last_name text not null,
  password_hash text not null,
  otp_hash text not null,
  otp_expires_at timestamptz not null,
  attempts integer not null default 0,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pending_registration_attempts_non_negative check (attempts >= 0)
);

-- Un solo registro pendiente por correo y por username (sin distinguir
-- mayúsculas), para poder aplicar la política "el último registro gana".
create unique index if not exists pending_registration_email_key
  on public.pending_registration (lower(email));
create unique index if not exists pending_registration_username_key
  on public.pending_registration (lower(username));

create index if not exists idx_pending_registration_created_at
  on public.pending_registration (created_at);

-- Igual que las tablas de Better Auth: el cliente nunca debe leer ni escribir
-- registros pendientes (contienen hashes de contraseña y del OTP).
alter table public.pending_registration enable row level security;
revoke all on table public.pending_registration from anon, authenticated;
revoke all on table public.pending_registration from public;
revoke all on table public.pending_registration from service_role;

commit;
