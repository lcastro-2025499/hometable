# Investigación e Integraciones: Better Auth, reCAPTCHA y Resend

**Código**: `400-better-auth-login` | **Fecha**: 2026-11-09 | **Actualizado**:
2026-11-11

---

## 1. Better Auth + Next.js App Router

### 1.1 Handler y adaptador

Better Auth expone un handler en `src/app/api/auth/[...all]/route.ts`. La
configuración usa el pool de `pg` (`database: pool`), no un ORM, para compartir la
conexión con el resto de la aplicación.

- Cookies de sesión `httpOnly`, `SameSite=Lax` y `Secure` cuando `baseURL` es
  HTTPS.
- `baseURL` canónica desde `BETTER_AUTH_URL`; sin valores por defecto silenciosos.
- `trustedOrigins` incluye la URL canónica y las de
  `BETTER_AUTH_TRUSTED_ORIGINS`.
- Sesión de 7 días con renovación cada día (`expiresIn` / `updateAge`).

### 1.2 Registro deshabilitado

`disableSignUp: true` impide que Better Auth acepte `POST /api/auth/sign-up/email`.
Sin esta opción, cualquiera podría crear una cuenta saltándose reCAPTCHA, el OTP y
el rate limit del flujo propio.

### 1.3 Verificación obligatoria

`requireEmailVerification: true` y `autoSignIn: false`. Better Auth solo comprueba
`emailVerified` al iniciar sesión; el envío del OTP lo gestiona la aplicación.

### 1.4 Por qué no se usa el plugin `emailOTP`

Se probó y se retiró: el plugin exige que el usuario exista antes de enviar el
código. Eso obligaba a crear una cuenta sin verificar, bloqueaba el email/usuario
aunque el correo estuviera mal escrito y dejaba cuentas basura. El flujo actual
guarda un `pending_registration` y crea la cuenta solo al confirmar.

---

## 2. Google reCAPTCHA v2 Checkbox

- Cliente: `react-google-recaptcha` con `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`.
- Servidor: `src/lib/recaptcha.ts` hace `POST` a
  `https://www.google.com/recaptcha/api/siteverify` con `secret` y `response`.
- Fail-closed: si falta el secreto, la red falla o Google rechaza el token, el
  registro responde con error y no se guarda nada.
- La CSP permite `https://www.google.com`, `https://www.gstatic.com` y los iframes
  de reCAPTCHA.

---

## 3. Resend para correo transaccional

- SDK `resend` (no `@resend/node`, que no existe).
- `RESEND_API_KEY` y `EMAIL_FROM` obligatorios. Sin remitente de respaldo: si el
  dominio no está verificado, el envío falla de forma cerrada.
- Plantillas HTML propias para el OTP y el restablecimiento, con escape de los
  datos del usuario.
- El registro responde `502` si el correo no se puede enviar; el pendiente no se
  conserva como si hubiera funcionado.

---

## 4. Rate limit

### 4.1 Problema

El almacenamiento por defecto de Better Auth es memoria del proceso. En Vercel cada
instancia serverless tendría su propio contador y el límite real se multiplicaría.

### 4.2 Solución

`public.auth_rate_limit` con `key` primaria y una operación
`insert ... on conflict do update` que reinicia la ventana o incrementa el contador
de forma atómica. Se usa en dos capas:

1. **Rutas propias** (`checkRateLimit`): registro (5/15 min), verificación
   (10/15 min) y reenvío (3/15 min) por IP + identificador.
2. **Better Auth** (`consumeRateLimit` como `customStorage`): comparte el mismo
   contador entre instancias.

---

## 5. Protección de rutas: `proxy.ts`, no `middleware.ts`

Next.js 16 renombró la convención a `src/proxy.ts`. El proxy:

- comprueba solo la **presencia** de la cookie de sesión;
- redirige a `/login` si falta en una ruta privada;
- **no** redirige a `/` por tener cookie: una cookie caducada crearía un bucle entre
  `/` y `/login`;
- emite la CSP con un nonce por petición.

Las páginas públicas usan `useRedirectIfAuthenticated`, que espera a que Better Auth
confirme la sesión antes de redirigir.

---

## 6. CSP con nonce

La CSP se emite en `src/proxy.ts` porque necesita un nonce distinto por request. El
layout raíz lo lee con `headers()` y lo pasa a `next-themes`. `script-src` usa
`'nonce-...' 'strict-dynamic'`; `style-src` mantiene `'unsafe-inline'` porque React
y next-themes usan atributos `style`. `connect-src` permite
`https://*.supabase.co` y `wss://*.supabase.co` para Realtime.

Como el layout lee `headers()`, todas las rutas se renderizan por petición
(`export const instant = false`). Es intencionado.

---

## 7. TLS de PostgreSQL

Supabase usa una CA interna. Validar la cadena con las CAs del sistema devuelve
`SELF_SIGNED_CERT_IN_CHAIN`, incluso a través del pooler. Opciones evaluadas:

| Opción | Resultado |
|--------|-----------|
| `rejectUnauthorized: true` sin CA | ❌ Rompe la conexión |
| `rejectUnauthorized: false` | ✅ Funciona; cifra sin validar cadena |
| `SUPABASE_DB_CA_CERT` con la CA del proyecto | ✅ Validación completa (recomendado) |

`db.ts` usa la CA si está definida y, si no, mantiene el comportamiento histórico
para no romper el arranque.

---

## 8. Pruebas

- Vitest 3 en entorno `node`, con alias `@/*`.
- Se cubren funciones puras: validación de autenticación, validación de tareas,
  utilidades de tablero, mapeo de filas, helpers HTTP y firma del JWT de Realtime.
- No se prueban componentes React ni la base de datos en unit tests; eso queda para
  el QA manual y las comprobaciones SQL.
- La CI ejecuta install, lint, typegen, tipos, tests y build con variables
  ficticias; no se conecta a Supabase.

---

## 9. Decisiones descartadas

| Decisión | Motivo |
|----------|--------|
| Plugin `emailOTP` | Exigía crear la cuenta antes de verificar. |
| OAuth social en esta versión | Fuera de alcance; el producto usa email/contraseña. |
| `middleware.ts` | Next.js 16 usa `proxy.ts`. |
| Rate limit en memoria | No se comparte entre instancias serverless. |
| Realtime con escrituras | RLS de escritura por fila y auditoría más compleja. |
| Migrar `taskboard:*` | La arquitectura local se abandonó en la v2.0. |

---

**Conclusión**: Better Auth cubre credenciales y sesiones; la aplicación añade el
registro diferido, el rate limit persistente y la verificación por OTP que Better
Auth no ofrece por sí solo en este flujo.
