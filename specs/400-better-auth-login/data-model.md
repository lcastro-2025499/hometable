# Modelo de Datos: Autenticación con Better Auth y Tableros

**Código**: `400-better-auth-login` | **Fecha**: 2026-11-09 | **Actualizado**:
2026-11-11

---

## 1. Tablas de Better Auth

Better Auth usa nombres camelCase porque el adaptador `pg` los cita literalmente.
Fuente de verdad: `supabase/migrations/20261109151500_better_auth_tables.sql`.

### `public."user"`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `text` | PK |
| `name` | `text` | NOT NULL |
| `email` | `text` | NOT NULL, UNIQUE |
| `emailVerified` | `boolean` | NOT NULL, default `false` |
| `image` | `text` | NULL |
| `createdAt` | `timestamptz` | NOT NULL |
| `updatedAt` | `timestamptz` | NOT NULL |
| `username` | `text` | UNIQUE (plugin `username`) |
| `displayUsername` | `text` | Plugin `username` |
| `firstName` | `text` | NOT NULL, campo adicional |
| `lastName` | `text` | NOT NULL, campo adicional |

### `public.session`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `text` | PK |
| `expiresAt` | `timestamptz` | NOT NULL; 7 días |
| `token` | `text` | NOT NULL, UNIQUE |
| `createdAt` | `timestamptz` | NOT NULL |
| `updatedAt` | `timestamptz` | NOT NULL |
| `ipAddress` | `text` | NULL |
| `userAgent` | `text` | NULL |
| `userId` | `text` | NOT NULL, FK a `user.id` con `ON DELETE CASCADE` |

Índice: `session_userId_idx`.

### `public.account`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `text` | PK |
| `accountId` | `text` | NOT NULL |
| `providerId` | `text` | NOT NULL (`credential`) |
| `userId` | `text` | NOT NULL, FK a `user.id` con `ON DELETE CASCADE` |
| `accessToken`, `refreshToken`, `idToken` | `text` | NULL |
| `accessTokenExpiresAt`, `refreshTokenExpiresAt` | `timestamptz` | NULL |
| `scope` | `text` | NULL |
| `password` | `text` | Hash de Better Auth |
| `createdAt`, `updatedAt` | `timestamptz` | NOT NULL |

Índice: `account_userId_idx`.

### `public.verification`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `text` | PK |
| `identifier` | `text` | NOT NULL |
| `value` | `text` | NOT NULL (token de reset) |
| `expiresAt` | `timestamptz` | NOT NULL |
| `createdAt`, `updatedAt` | `timestamptz` | NOT NULL |

Índice: `verification_identifier_idx`.

---

## 2. Registro pendiente

### `public.pending_registration`

Fuente: `supabase/migrations/20261110200442_pending_registrations.sql`.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `email` | `text` | NOT NULL |
| `username` | `text` | NOT NULL |
| `display_username` | `text` | NOT NULL |
| `name` | `text` | NOT NULL |
| `first_name` | `text` | NOT NULL |
| `last_name` | `text` | NOT NULL |
| `password_hash` | `text` | NOT NULL |
| `otp_hash` | `text` | NOT NULL |
| `otp_expires_at` | `timestamptz` | NOT NULL |
| `attempts` | `integer` | NOT NULL, default `0`, CHECK `>= 0` |
| `sent_at` | `timestamptz` | NOT NULL |
| `created_at`, `updated_at` | `timestamptz` | NOT NULL |

Índices únicos por `lower(email)` y `lower(username)`: permiten la política «el
último registro gana» sin distinguir mayúsculas. RLS activo y sin grants para
`anon`, `authenticated`, `public` ni `service_role`.

**Ciclo de vida**:

1. `registerPending` valida reCAPTCHA, hashea contraseña y OTP y hace `upsert` del
   pendiente (reemplaza uno anterior del mismo email o usuario).
2. `verifyPendingRegistration` compara el OTP con `timingSafeEqual`, descuenta
   intentos y, si es correcto, borra el pendiente y crea `user` + `account` en una
   transacción.
3. Un pendiente expirado se elimina y la verificación responde `410`.
4. Los pendientes de más de 24 horas se purgan en el siguiente registro.

---

## 3. Rate limit

### `public.auth_rate_limit`

Fuente: `supabase/migrations/20261111162025_auth_rate_limit.sql`.

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `key` | `text` | PK |
| `window_started_at` | `timestamptz` | NOT NULL |
| `count` | `integer` | NOT NULL, CHECK `>= 0` |

Índice por `window_started_at`. RLS activo y sin grants públicos. La clave combina
ruta, IP e identificador. `consumeRateLimit` usa `insert ... on conflict` para que
la comprobación y el incremento sean atómicos entre instancias serverless.

---

## 4. Tablero (preparación futura)

### `public.board`

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `name` | `text` | NOT NULL |
| `owner_id` | `text` | NOT NULL, FK a `user.id` con `ON DELETE CASCADE` |
| `type` | `text` | NOT NULL, default `personal`, CHECK `personal`/`invited` |
| `created_at` | `timestamptz` | NOT NULL |

Índice `idx_board_owner_id`. RLS activo y sin grants públicos. `tasks.board_id` es
nullable y referencia `board.id` con `ON DELETE CASCADE`; se usará cuando exista
multi-tablero (máximo 2 por usuario).

---

## 5. Relación con las tareas

```text
public."user" (id text)
      │
      ├──< public.session (userId)
      ├──< public.account (userId)
      ├──< public.board (owner_id)
      └──< public.tasks (owner_id)   -- NOT NULL, ON DELETE CASCADE
```

- `tasks.owner_id` es `text`, no `uuid`, para alinearse con Better Auth.
- El servidor deriva `owner_id` de `session.user.id`; el cliente nunca lo envía.
- La policy de Realtime compara `owner_id` con `auth.jwt() ->> 'sub'`.
- Borrar un usuario elimina en cascada sus sesiones, cuentas, tableros y tareas.

---

## 6. Seguridad del esquema

| Tabla | RLS | Grants públicos |
|-------|-----|-----------------|
| `user` | ✅ | Ninguno |
| `session` | ✅ | Ninguno |
| `account` | ✅ | Ninguno |
| `verification` | ✅ | Ninguno |
| `pending_registration` | ✅ | Ninguno (ni `service_role`) |
| `auth_rate_limit` | ✅ | Ninguno |
| `board` | ✅ | Ninguno |
| `tasks` | ✅ | `SELECT` a `authenticated`; escrituras revocadas |

Todo el acceso de escritura pasa por la conexión directa a Postgres del servidor
(`DATABASE_URL`). La `anon key` no permite leer ni escribir estas tablas.

---

## 7. Verificación del modelo

- [x] Tablas creadas por migraciones idempotentes y ordenadas.
- [x] `owner_id` como `text NOT NULL` con FK a `public."user"`.
- [x] Índices de sesión, cuenta, verificación, pendientes, rate limit y tablero.
- [x] RLS activo y sin grants públicos en todas las tablas de identidad.
- [x] `emailVerified` obligatorio para iniciar sesión y para usar la API.
- [x] Hashes de contraseña y OTP fuera de cualquier respuesta HTTP.
- [x] Borrado en cascada desde `user` hasta `tasks`.
