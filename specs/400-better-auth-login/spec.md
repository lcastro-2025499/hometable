# Especificación: Autenticación obligatoria con Better Auth y Supabase

**Código**: `400-better-auth-login` | **Fecha**: 2026-11-09 | **Actualizado**:
2026-11-11 | **Estado**: Implementado y en producción
**Proyecto Supabase**: `tfjbkvxxdglxujnrcaeb`

---

## 1. Resumen y objetivos

Hometable exige una cuenta para acceder al tablero. La autenticación se implementa
con **Better Auth** sobre el mismo PostgreSQL de Supabase, con verificación de
correo obligatoria y registro diferido: la cuenta real no existe hasta que la
persona confirma un código OTP.

### Objetivos clave

1. **Acceso obligatorio**: `/` exige sesión y correo verificado; el resto de rutas
   privadas redirigen a `/login`.
2. **Email/contraseña y usuario/contraseña** mediante Better Auth.
3. **Registro completo**: nombres, apellidos, nombre de usuario (3-15 caracteres),
   email, contraseña (8+ caracteres, una mayúscula y dos números), confirmación y
   **Google reCAPTCHA v2 Checkbox**. El botón permanece deshabilitado hasta que todo
   es válido.
4. **Verificación por OTP** de 6 dígitos enviado con Resend; la cuenta se crea solo
   al confirmarlo.
5. **Recuperación de contraseña** con enlace/código enviado por Resend.
6. **«Recordarme»** en el login, con sesión de 7 días.
7. **Diseño consistente** con shadcn/ui, temas claro/oscuro/sistema y textos en
   español.

### Fuera de alcance

- OAuth social, 2FA, passkeys e inicio de sesión sin contraseña.
- Cambio de nombre de usuario desde la UI.
- Tableros compartidos, invitaciones y chat (solo existe la tabla `board`
  preparada).

---

## 2. Requisitos funcionales

- **RF-01**: Ningún usuario accede a `/` sin sesión activa. Sin correo verificado,
  redirige a `/verify-email`.
- **RF-02**: El registro valida:
  - nombres y apellidos no vacíos (máx. 50 caracteres);
  - usuario único de 3-15 caracteres (`[a-zA-Z0-9_]`);
  - email válido;
  - contraseña de 8-128 caracteres, al menos una mayúscula y dos números;
  - coincidencia exacta entre contraseña y confirmación;
  - reCAPTCHA v2 aprobado en cliente y servidor.
- **RF-03**: El botón de registro permanece inactivo si alguna validación falla o
  el reCAPTCHA no está aprobado.
- **RF-04**: El registro no crea la cuenta: guarda un `pending_registration` con la
  contraseña y el OTP hasheados, y envía el código.
- **RF-05**: `/verify-email` confirma el OTP, crea `user` + `account` y redirige a
  `/login`. El código caduca a los 10 minutos y admite 5 intentos.
- **RF-06**: El reenvío del OTP respeta un cooldown de 60 segundos y responde de
  forma genérica para no enumerar correos.
- **RF-07**: El login acepta correo o usuario, contraseña y «Recordarme». Una
  cuenta sin verificar recibe `EMAIL_NOT_VERIFIED` y se le indica completar el
  registro.
- **RF-08**: La recuperación de contraseña envía un enlace/código; la página acepta
  `?token=` y `?error=` y permite pegar el código.
- **RF-09**: Las vistas de autenticación tienen enlaces cruzados y selector de tema.
- **RF-10**: Al cerrar sesión se limpia la sesión del servidor y se vuelve a
  `/login`.

---

## 3. Requisitos no funcionales

- **RNF-01**: Contraseñas y OTP hasheados; sin secretos ni claves de servicio en el
  cliente.
- **RNF-02**: TypeScript estricto y Zod en cliente y servidor.
- **RNF-03**: Accesibilidad (labels, foco, `aria-invalid`, mensajes anunciados) y
  componentes shadcn/ui.
- **RNF-04**: Rate limit persistente en Postgres para registro, verificación,
  reenvío y endpoints de Better Auth.
- **RNF-05**: Rutas de escritura con verificación de mismo origen.
- **RNF-06**: CSP con nonce por petición que permita reCAPTCHA y Supabase.
- **RNF-07**: Cobertura Vitest de las validaciones de autenticación y del token de
  Realtime.
- **RNF-08**: CI con lint, typegen, tipos, tests y build.

---

## 4. Flujos

### 4.1 Registro

```text
[Formulario válido + reCAPTCHA]
        ↓
POST /api/auth/register
        ↓
verifica reCAPTCHA (fail-closed) + rate limit
        ↓
crea/reemplaza pending_registration (hash de contraseña y OTP)
        ↓
envía el OTP con Resend
        ↓
/verify-email
        ↓
OTP correcto → crea public."user" (emailVerified=true) + account
        ↓
/login
```

### 4.2 Login

```text
[correo o usuario + contraseña]
        ↓
Better Auth (rate limit persistente)
        ↓
¿correo verificado? → no: EMAIL_NOT_VERIFIED
        ↓ sí
cookie httpOnly + redirección a /
```

### 4.3 Recuperación

```text
[email] → requestPasswordReset → Resend (enlace + token)
        ↓
/forgot-password?token=... o código pegado a mano
        ↓
resetPassword (nueva contraseña válida)
        ↓
/login
```

---

## 5. Seguridad

- `disableSignUp: true` en Better Auth: `POST /api/auth/sign-up/email` no existe y
  el único alta es el flujo con reCAPTCHA + OTP.
- `requireEmailVerification: true` y `autoSignIn: false`.
- Registro pendiente con email/usuario únicos, purga de pendientes antiguos y
  política «el último gana»; un conflicto con una cuenta verificada devuelve `409`.
- El OTP viaja vinculado al navegador con una cookie `httpOnly` firmada por HMAC.
- Rate limit en `public.auth_rate_limit` (compartido entre instancias serverless) y
  límites por ruta en `src/lib/rate-limit.ts`.
- Mensajes genéricos ante correo/usuario ocupado y en el reenvío.
- `BETTER_AUTH_URL` y `BETTER_AUTH_TRUSTED_ORIGINS` validados; HTTPS obligatorio en
  producción.
- La CSP y las cabeceras de seguridad se emiten en `src/proxy.ts` y
  `next.config.ts`.

---

## 6. Criterios de aceptación

- [x] `/` sin sesión redirige a `/login`; sin verificar, a `/verify-email`.
- [x] El registro no crea `user` hasta confirmar el OTP.
- [x] OTP incorrecto descuenta intentos; el quinto devuelve `too_many_attempts`.
- [x] OTP correcto crea `user` verificado y `account` con
  `providerId = "credential"`.
- [x] El login funciona por correo y por usuario.
- [x] `EMAIL_NOT_VERIFIED` guía a completar el registro.
- [x] El reenvío aplica cooldown y responde de forma genérica.
- [x] La recuperación acepta enlace y código.
- [x] No existe `POST /api/auth/sign-up/email`.
- [x] Rate limit persistente activo en producción.
- [x] Pruebas de `auth-validation` en verde.
- [x] CI y build en verde.
- [x] QA manual de registro, login, recuperación y cierre de sesión.

---

**Versión**: 2.0.0 | **Estado**: Implementado y verificado en producción
