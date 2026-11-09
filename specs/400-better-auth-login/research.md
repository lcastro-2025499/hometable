# Investigación e Integraciones: Better Auth, reCAPTCHA y Resend

**Código**: `400-better-auth-login` | **Fecha**: 2026-11-09

---

## 1. Better Auth + Next.js App Router

Better Auth expone un handler HTTP para Next.js en `src/app/api/auth/[...all]/route.ts`:
- Soporta adaptador `pg` o `kysely` contra la URL de conexión de PostgreSQL de Supabase.
- Configura cookies de sesión HttpOnly.
- Permite extender la vigencia de la sesión a 7 días mediante la opción de "Remember me".

## 2. Google reCAPTCHA v2 Checkbox

- En el cliente, se utiliza `@google/recaptcha-react` o la carga del script oficial de reCAPTCHA v2 Checkbox.
- En el servidor, se valida la respuesta mediante un POST a `https://www.google.com/recaptcha/api/siteverify` pasando `secret` y `response`.

## 3. Resend para Envío de Correos

- Utiliza `@resend/node` o fetch directo a `https://api.resend.com/emails`.
- Gratuito hasta 100 correos al día.
- En desarrollo se utiliza el dominio de prueba `onboarding@resend.dev`.
