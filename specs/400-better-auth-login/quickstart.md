# Quickstart: Autenticación con Better Auth

**Código**: `400-better-auth-login` | **Fecha**: 2026-11-09 | **Actualizado**:
2026-11-11 | **Estado**: Implementado y en producción

---

## 1. Prerequisitos

- Node.js 22 y pnpm 12.
- Proyecto Supabase con PostgreSQL (el actual es `tfjbkvxxdglxujnrcaeb`) y
  Realtime habilitado.
- Proyecto de Google reCAPTCHA v2 Checkbox con los dominios de desarrollo y
  producción dados de alta.
- Cuenta de Resend con un dominio verificado para el remitente de `EMAIL_FROM`.

---

## 2. Variables de entorno

Copiar `.env.example` a `.env.local` y rellenar **todas** las variables. El
archivo `.env.local` está ignorado por git.

```bash
# Supabase Realtime
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-public-key]
SUPABASE_JWT_SECRET=[jwt-secret]

# Base de datos (pooler en 6543; directa solo para mantenimiento)
DATABASE_URL=postgresql://postgres.[ref]:[password]@[region].pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres
SUPABASE_DB_CA_CERT=

# Better Auth
BETTER_AUTH_SECRET=[32+ caracteres aleatorios]
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_TRUSTED_ORIGINS=

# reCAPTCHA
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=[site-key]
RECAPTCHA_SECRET_KEY=[secret-key]

# Resend
RESEND_API_KEY=re_[...]
EMAIL_FROM=no-reply@[dominio-verificado]
```

Notas:

- `BETTER_AUTH_SECRET` se genera con `openssl rand -base64 32` y firma tanto la
  sesión como la cookie httpOnly que vincula el OTP al navegador.
- En producción `BETTER_AUTH_URL` debe ser HTTPS y coincidir con el dominio real.
  `http://localhost` solo se acepta en desarrollo.
- `BETTER_AUTH_TRUSTED_ORIGINS` admite una lista separada por comas para dominios
  adicionales (por ejemplo el alias de Vercel).
- Si `SUPABASE_DB_CA_CERT` está vacío, la conexión cifra sin validar la cadena
  porque la CA de Supabase es interna (`SELF_SIGNED_CERT_IN_CHAIN`).

---

## 3. Base de datos

La fuente de verdad es el conjunto ordenado de `supabase/migrations/`. Aplicar en
orden desde un proyecto vacío:

```bash
supabase link --project-ref [project-ref]
supabase db push
```

O pegar cada archivo en **SQL Editor → Run**, empezando por
`20261109151132_align_tasks_schema_and_realtime.sql` y terminando por
`20261112040000_tasks_owner_not_null_and_board_index.sql`.

Las migraciones relevantes para autenticación son:

| Archivo | Contenido |
|---------|-----------|
| `20261109151500_better_auth_tables.sql` | `user`, `session`, `account`, `verification`, `board`, `owner_id` |
| `20261110161929_enable_rls_auth_tables.sql` | RLS en las tablas de identidad |
| `20261110171312_lock_down_tasks.sql` | Revocación de escrituras y RLS de tareas |
| `20261110200442_pending_registrations.sql` | Registro pendiente con OTP |
| `20261111162025_auth_rate_limit.sql` | Contadores persistentes |
| `20261111174752_harden_policy_and_function.sql` | `auth.jwt()` en subconsulta y `search_path` fijo |
| `20261111174801_harden_realtime_policy_jwt_subquery.sql` | Misma policy, idempotente |
| `20261112040000_tasks_owner_not_null_and_board_index.sql` | `owner_id NOT NULL` e índice de `board` |

Después de aplicar, comprobar:

```sql
select column_name, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'tasks'
order by ordinal_position;

select tablename, rowsecurity
from pg_tables
where schemaname = 'public';
```

`owner_id` debe ser `NOT NULL` y todas las tablas de identidad deben tener
`rowsecurity = true`.

> No se aplican migraciones nuevas desde el panel sin crear antes el archivo
> local correspondiente.

---

## 4. Ejecución local

```bash
pnpm install
pnpm dev
```

- <http://localhost:3000> → sin sesión redirige a `/login`.
- <http://localhost:3000/register> → alta con reCAPTCHA.
- <http://localhost:3000/verify-email> → OTP de 6 dígitos.
- <http://localhost:3000/forgot-password> → recuperación con enlace o código.

Para reCAPTCHA en local, añadir `localhost` a los dominios permitidos del sitio en
la consola de Google.

---

## 5. Flujos

### 5.1 Registro y verificación

1. `/register` valida nombres, apellidos, usuario (3-15, `[a-zA-Z0-9_]`), email,
   contraseña (8-128, una mayúscula y dos números), confirmación y reCAPTCHA.
2. `POST /api/auth/register` verifica mismo origen, rate limit (5/15 min) y
   reCAPTCHA (fail-closed).
3. Se guarda un `pending_registration` con la contraseña y el OTP **hasheados** y
   se envía el código con Resend. La cuenta todavía **no** existe.
4. La respuesta crea una cookie `httpOnly` firmada que vincula el pendiente al
   navegador y redirige a `/verify-email?email=...`.
5. `POST /api/auth/verify-email` compara el OTP, descuenta intentos y, si es
   correcto, crea `public."user"` (`emailVerified = true`) + `public.account` en
   una transacción.
6. Redirección a `/login?verified=1`.

Reglas del OTP:

- 6 dígitos, caduca a los 10 minutos.
- Máximo 5 intentos; el quinto invalida el código.
- Reenvío con cooldown de 60 segundos y respuesta genérica (no revela si el correo
  existe).
- Un pendiente de más de 24 horas se purga en el siguiente registro.
- Si el correo o el usuario ya pertenecen a una cuenta verificada, el registro
  responde `409` con un mensaje genérico.

### 5.2 Login

- `/login` acepta **correo o nombre de usuario** y contraseña.
- «Recordarme» mantiene la sesión 7 días.
- Una cuenta sin verificar recibe `EMAIL_NOT_VERIFIED` y se le indica completar el
  registro.
- Al iniciar sesión, `/` comprueba la sesión con `getSession()`; si el correo no
  está verificado, redirige a `/verify-email`.

### 5.3 Recuperación de contraseña

1. `/forgot-password` envía el enlace con Resend.
2. La página acepta `?token=...` o el código pegado a mano y `?error=...`.
3. La nueva contraseña cumple las mismas reglas que el registro.
4. Al terminar, redirección a `/login`.

### 5.4 Cierre de sesión

El menú de usuario cierra la sesión en el servidor, limpia la cookie y vuelve a
`/login`.

---

## 6. Protección de rutas

- `src/proxy.ts` (convención de Next.js 16, no `middleware.ts`):
  - comprueba solo la **presencia** de la cookie de sesión;
  - redirige a `/login` si falta en una ruta privada;
  - **no** redirige a `/` por tener cookie (una cookie caducada crearía un bucle);
  - emite la CSP con un nonce por petición.
- Las páginas de servidor validan la sesión real con `getSession()`
  (`src/lib/auth-server.ts`).
- Las páginas públicas usan `useRedirectIfAuthenticated`, que espera la
  confirmación de Better Auth antes de redirigir.
- `/api/tasks` y `/api/realtime/token` exigen sesión y correo verificado.
- Las escrituras exigen además mismo origen (`Origin` válido).

---

## 7. Puertas de calidad

```bash
pnpm lint
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

`pnpm test` ejecuta 46 pruebas Vitest en 6 archivos. La CI de
`.github/workflows/ci.yml` ejecuta las cinco puertas en cada push a `master` y en
cada pull request, con variables ficticias y sin conectarse a Supabase.

---

## 8. Depuración

### 8.1 Registro

- ¿El botón está deshabilitado? Revisar validación de campos y que reCAPTCHA esté
  aprobado.
- `400 No pudimos verificar el reCAPTCHA` → `RECAPTCHA_SECRET_KEY` incorrecta,
  dominio no autorizado o token caducado.
- `409` → correo o usuario ya en uso (mensaje genérico intencionado).
- `429` → rate limit; revisar `Retry-After`.
- `502` → Resend rechazó el envío; comprobar `EMAIL_FROM` verificado y
  `RESEND_API_KEY`.

### 8.2 Verificación

```sql
select email, username, attempts, otp_expires_at, sent_at
from public.pending_registration
order by created_at desc
limit 5;
```

- `410` → el OTP caducó; pedir uno nuevo.
- `400` con «Te quedan N intentos» → código incorrecto.
- `429` → se agotaron los 5 intentos o el rate limit de la ruta.
- «No encontramos una verificación activa» → falta la cookie del pendiente
  (otro navegador, cookies borradas o modo incógnito distinto).

### 8.3 Login

```sql
select id, email, username, "emailVerified" from public."user"
order by "createdAt" desc limit 5;
```

- `EMAIL_NOT_VERIFIED` → completar `/verify-email` antes de entrar.
- Revisar que `/api/auth/[...all]` responda y que `BETTER_AUTH_URL` coincida con
  el origen real.

### 8.4 Base de datos

```bash
psql "$DIRECT_URL" -c 'select count(*) from public."user";'
```

Si aparece `SELF_SIGNED_CERT_IN_CHAIN`, configurar `SUPABASE_DB_CA_CERT` o
mantener la validación desactivada (comportamiento por defecto).

### 8.5 Seguridad

```bash
curl -i http://localhost:3000/api/tasks
# 401 sin cookie

curl -i -X POST http://localhost:3000/api/auth/sign-up/email \
  -H 'content-type: application/json' -d '{}'
# 404/405: disableSignUp elimina el alta directa
```

---

## 9. Checklist

- [x] Variables documentadas en `.env.example` y configuradas en Vercel.
- [x] Migraciones ordenadas y reproducibles.
- [x] Registro con reCAPTCHA y OTP; la cuenta no existe hasta verificar.
- [x] OTP hasheado, 10 minutos, 5 intentos y cooldown de 60 s.
- [x] Login por correo y por usuario con «Recordarme».
- [x] Recuperación con enlace y código.
- [x] `disableSignUp: true` y verificación obligatoria.
- [x] Rate limit persistente compartido entre instancias.
- [x] CSP con nonce y cabeceras de seguridad.
- [x] `pnpm lint`, `next typegen`, `tsc --noEmit`, `pnpm test` y `pnpm build` en
  verde.
- [x] CI en GitHub Actions.
- [x] QA manual documentado en `QA.md`.
