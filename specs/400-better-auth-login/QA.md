# QA: Autenticación obligatoria con Better Auth

**Código**: `400-better-auth-login` | **Fecha**: 2026-11-09 | **Actualizado**:
2026-11-11
**Proyecto Supabase**: `tfjbkvxxdglxujnrcaeb`
**Entorno**: local (`pnpm dev`), base de datos real y producción en Vercel.

---

## 1. Alcance y método

1. **Automatizado**: lint, typegen, tipos, Vitest, build y CI.
2. **Base de datos**: tablas, RLS, grants, índices y políticas.
3. **HTTP**: respuestas de registro, verificación, reenvío y API de tareas.
4. **Seguridad**: alta directa deshabilitada, mismo origen, rate limit, CSP.
5. **Manual**: flujo completo en navegador (registro, OTP, login, recuperación,
   cierre de sesión) y sesión compartida entre dispositivos.

---

## 2. Puertas de calidad

| Comando | Resultado |
|---------|-----------|
| `pnpm lint` | ✅ Sin errores ni warnings |
| `pnpm exec next typegen` | ✅ Tipos generados |
| `pnpm exec tsc --noEmit` | ✅ Sin errores |
| `pnpm test` | ✅ 46 pruebas en 6 archivos |
| `pnpm build` | ✅ Build de producción correcto |
| CI `.github/workflows/ci.yml` | ✅ Las cinco puertas |

`pnpm build` se verificó también sin `.env.local`, usando variables ficticias como
en CI. La validación de esquema de Better Auth se desactiva durante
`next build` (`NEXT_PHASE === "phase-production-build"`) porque no hay base de
datos disponible; en ejecución sigue activa.

---

## 3. Esquema y permisos

Comprobado en el proyecto real:

- [x] `public."user"`, `session`, `account`, `verification`, `board`,
  `pending_registration` y `auth_rate_limit` existen.
- [x] RLS activo en todas las tablas de identidad.
- [x] Sin grants para `anon`, `authenticated`, `public` ni `service_role` en las
  tablas de identidad.
- [x] `tasks.owner_id` es `text NOT NULL` con FK a `public."user"(id)` y
  `ON DELETE CASCADE`.
- [x] `auth_rate_limit` con `key` primaria y `count` con CHECK `>= 0`.
- [x] `pending_registration` con índices únicos por `lower(email)` y
  `lower(username)`.
- [x] Índices `session_userId_idx`, `account_userId_idx`,
  `verification_identifier_idx`, `idx_board_owner_id`.
- [x] Migraciones locales alineadas con el historial remoto de Supabase.

### 3.1 Reproducibilidad

- [x] `20261109151132` → `20261112040000` se aplican en orden desde un proyecto
  vacío.
- [x] Las migraciones son idempotentes (`create table if not exists`,
  `create index if not exists`, `drop policy if exists`).
- [x] `owner_id` se comprobó sin filas nulas antes de `SET NOT NULL`.
- [x] No se aplicó DDL desde el panel sin archivo local equivalente.

---

## 4. Registro

| Caso | Resultado |
|------|-----------|
| Campos incompletos o inválidos | ✅ Botón deshabilitado / `400` |
| Contraseña sin mayúscula o con un solo número | ✅ `400` con mensaje de validación |
| Contraseñas distintas | ✅ `400` en `confirmPassword` |
| reCAPTCHA no aprobado | ✅ Botón deshabilitado; `400` en servidor |
| `RECAPTCHA_SECRET_KEY` ausente | ✅ Fail-closed: no se guarda nada |
| Primer registro válido | ✅ `200 { success: true, requiresEmailVerification: true }` |
| Correo o usuario ya verificados | ✅ `409` con mensaje genérico |
| Registro repetido con el mismo correo | ✅ Reemplaza el pendiente («el último gana») |
| Cuerpo mayor de 16 KiB | ✅ `413` antes de parsear |
| Origen distinto | ✅ `403` |
| Más de 5 intentos en 15 min | ✅ `429` con `Retry-After` |

Comprobaciones SQL tras el registro:

- [x] Existe una fila en `pending_registration`.
- [x] `password_hash` y `otp_hash` no contienen el valor en claro.
- [x] **No** existe todavía una fila en `public."user"`.
- [x] La cookie del pendiente es `httpOnly`, `SameSite=Lax` y firmada con HMAC.

---

## 5. Verificación por OTP

| Caso | Resultado |
|------|-----------|
| OTP correcto | ✅ `200`, crea `user` + `account` y borra el pendiente |
| OTP incorrecto | ✅ `400` con intentos restantes |
| Quinto intento fallido | ✅ `429`; el código queda inutilizado |
| OTP caducado (>10 min) | ✅ `410` |
| Reenvío antes de 60 s | ✅ `429` con `Retry-After` |
| Reenvío de un correo inexistente | ✅ `200` genérico (no enumera) |
| Verificación sin cookie del pendiente | ✅ `400` «No encontramos una verificación activa» |
| Verificación desde otro navegador | ✅ Rechazada (cookie firmada) |
| Más de 10 intentos de verificación en 15 min | ✅ `429` |

Tras verificar:

- [x] `public."user"` tiene `emailVerified = true`.
- [x] `public.account` tiene `providerId = 'credential'` y el hash de contraseña.
- [x] El pendiente desaparece.
- [x] No se inicia sesión automáticamente (`autoSignIn: false`).
- [x] Redirección a `/login?verified=1`.

---

## 6. Login y sesión

| Caso | Resultado |
|------|-----------|
| Correo + contraseña correctos | ✅ Acceso a `/` |
| Usuario + contraseña correctos | ✅ Acceso a `/` |
| Contraseña incorrecta | ✅ Error genérico, sin filtrar si el correo existe |
| Cuenta sin verificar | ✅ `EMAIL_NOT_VERIFIED` y guía a `/verify-email` |
| «Recordarme» marcado | ✅ Sesión de 7 días (`expiresIn` / `updateAge`) |
| Cookie caducada en `/login` | ✅ Sin bucle con `/` (`useRedirectIfAuthenticated`) |
| Cierre de sesión | ✅ Limpia la sesión y vuelve a `/login` |
| `/` sin sesión | ✅ `307` a `/login` |
| `/` con sesión sin verificar | ✅ Redirección a `/verify-email` |
| `/api/tasks` sin sesión | ✅ `401` JSON |
| `/api/tasks` sin verificar | ✅ `403` JSON |

---

## 7. Recuperación de contraseña

| Caso | Resultado |
|------|-----------|
| Correo registrado | ✅ Envía enlace con Resend |
| Correo no registrado | ✅ Respuesta genérica (no enumera) |
| `?token=` válido | ✅ Formulario precargado |
| Código pegado a mano | ✅ Aceptado |
| Token inválido o caducado | ✅ Mensaje con `?error=` y opción de reintentar |
| Nueva contraseña inválida | ✅ `400` con las mismas reglas del registro |
| Contraseñas distintas | ✅ `400` |
| Tras el cambio | ✅ Login con la nueva contraseña |

---

## 8. Seguridad

- [x] `disableSignUp: true`: `POST /api/auth/sign-up/email` no crea cuentas.
- [x] `requireEmailVerification: true` y `autoSignIn: false`.
- [x] Contraseñas y OTP hasheados; nunca se devuelven por HTTP.
- [x] Rate limit persistente en `public.auth_rate_limit`, compartido entre
  instancias serverless y usado también como `customStorage` de Better Auth.
- [x] Mensajes genéricos en registro y reenvío.
- [x] Mismo origen obligatorio en `/api/auth/register`,
  `/api/auth/verify-email`, `/api/auth/resend-verification`, `/api/tasks` y
  `/api/realtime/token`.
- [x] `BETTER_AUTH_URL` canónica; HTTPS obligatorio en producción fuera de
  localhost.
- [x] CSP con nonce por petición en `src/proxy.ts`; permite reCAPTCHA y
  `wss://*.supabase.co`.
- [x] `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS
  en producción y `poweredByHeader: false`.
- [x] `.env.local` ignorado por git; `.env.example` documenta cada variable.
- [x] Ningún secreto en el bundle del cliente.

### 8.1 Advisors de Supabase

- [x] `auth_rls_initplan` resuelto con `(select auth.jwt())`.
- [x] `function_search_path_mutable` resuelto con `search_path = ''`.
- [x] `rls_enabled_no_policy` en tablas de servidor: intencionado, sin grants.
- [x] `unindexed_foreign_keys` de `board`: resuelto con `idx_board_owner_id`.

---

## 9. QA manual en navegador

Ejecutado con el deployment de producción y con `pnpm dev`:

- [x] Registro con reCAPTCHA y recepción del OTP.
- [x] Reenvío del OTP tras el cooldown.
- [x] Verificación y redirección a `/login?verified=1`.
- [x] Login por correo y por usuario.
- [x] «Recordarme» y persistencia de la sesión.
- [x] Recuperación con enlace y con código.
- [x] Cierre de sesión y vuelta a `/login`.
- [x] Acceso al tablero en dos ventanas con la misma cuenta.
- [x] Temas claro, oscuro y sistema; responsive en móvil y escritorio.
- [x] Consola del navegador sin errores de CSP.

---

## 10. Despliegue en Vercel

| Comprobación | Resultado |
|--------------|-----------|
| Deployment de `master` | ✅ `READY` |
| URL de producción | ✅ <https://hometable.luuiscastro.me> |
| Alias de Vercel | ✅ <https://hometable-tasks.vercel.app> |
| Variables de Production | ✅ Configuradas por separado |
| `/` sin sesión | ✅ `307` a `/login` |
| `/api/tasks` sin sesión | ✅ `401` |
| `/api/realtime/token` sin sesión | ✅ `401` |
| Errores de runtime | ✅ Sin errores |

---

## 11. Conclusión

El registro diferido, la verificación por OTP, el login, la recuperación, el cierre
de sesión, el rate limit persistente y el aislamiento por cuenta están
implementados y verificados. Las cinco puertas automatizadas están en verde y la
CI las repite en cada push y pull request.
