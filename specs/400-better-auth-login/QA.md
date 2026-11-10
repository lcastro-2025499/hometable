# QA: Autenticación obligatoria Better Auth

**Código**: `400-better-auth-login` | **Fecha**: 2026-11-09

---

## Casos de Prueba

1. **Protección de Ruta**: Intentar acceder a `/` sin sesión redirige a `/login`.
2. **Registro de Usuario**:
   - Campos incompletos → botón deshabilitado.
   - Contraseña sin mayúscula o números → error de validación.
   - reCAPTCHA no aprobado → botón deshabilitado.
   - Registro exitoso → redirección a `/login`.
3. **Login y Recordar**:
   - Credenciales correctas → acceso a `/`.
   - Checkbox "Recordarme" marcado → cookie persistente por 7 días.
4. **Recuperación de Contraseña**:
   - Ingresar correo → envío de código de 6 dígitos mediante Resend.
   - Ingresar código y nueva contraseña → actualización exitosa.

## Casos de Verificación por OTP y Seguridad (2026-11-10)

Ejecutados con QA directo contra la base de datos y QA HTTP contra `pnpm dev`. Resultado: **todos aprobados**.

5. **Verificación de correo obligatoria**:
   - Registro sin verificar → login rechazado con `EMAIL_NOT_VERIFIED`.
   - Código OTP incorrecto → rechazado (`INVALID_OTP`).
   - Código OTP correcto → verificación y login exitosos.
6. **Registro fail-closed** (`/api/auth/register`):
   - Fallo de Resend → `502` y cuenta revertida (sin usuario residual).
   - Correo duplicado → `409`.
   - Payload inválido → `400`.
   - Sin reCAPTCHA → `400`.
7. **Aislamiento de tareas**:
   - Usuario B no puede leer ni sobrescribir tareas de A (misma id).
   - Usuario B no puede borrar tareas de A.
   - ID malicioso (inyección SQL) rechazado.
   - `replace` completo y borrado en cascada al eliminar usuario.
8. **Rutas API de tareas**:
   - `GET` sin sesión → `401` JSON.
   - `GET`/`POST`/`DELETE` con sesión propia → `200`.
   - `POST`/`DELETE` desde otro origen → `403` (protección CSRF).
9. **Supabase bloqueado**:
   - La anon key devuelve `401 permission denied` en `tasks`, `board`, `user`, `session`, `account` y `verification`.
   - Sin políticas RLS activas para `anon`/`authenticated` y sin grants de tabla.

## Casos de Registro Diferido (2026-11-10)

Ejecutados con QA directo contra la base de datos y QA HTTP contra `pnpm dev`. Resultado: **todos aprobados**.

10. **La cuenta no existe al registrarse**:
    - `POST /api/auth/register` (vía `registerPending`) crea una fila en `public.pending_registration` y **ninguna** en `public."user"`.
    - El código de verificación se envía desde `no-reply@luuiscastro.me`.
11. **Verificación y creación de la cuenta**:
    - OTP incorrecto: `invalid` con intentos restantes decrecientes (4, 3, 2, 1...).
    - Quinto intento incorrecto: `too_many_attempts`.
    - OTP correcto: crea `user` con `emailVerified = true` y `account` con `providerId = "credential"`; el login por email funciona.
    - OTP expirado: `expired` (`410` por HTTP).
    - Código reenviado: reinicia intentos y aplica cooldown de 60 s (`429` + `Retry-After`).
12. **Corrección de datos / último gana**:
    - Re-registrar con el mismo username y otro email elimina el pendiente anterior.
    - Re-registrar con el mismo email y otro username reemplaza el pendiente.
    - Un email o username de una cuenta **verificada** devuelve conflicto (`409`).
    - Una cuenta antigua con `emailVerified = false` y el mismo email/username se elimina al re-registrarse.
13. **Exposición de datos**:
    - `anon` y `authenticated` no tienen grants sobre `pending_registration`; RLS está activo.
    - Los hashes de contraseña y OTP no salen nunca en respuestas HTTP.
