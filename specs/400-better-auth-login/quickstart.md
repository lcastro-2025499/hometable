# Quickstart: Autenticación con Better Auth

**Código**: `400-better-auth-login` | **Fecha**: 2026-11-09

---

## 1. Variables de Entorno Requeridas

```env
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=...
RECAPTCHA_SECRET_KEY=...
RESEND_API_KEY=...
EMAIL_FROM=onboarding@hometable.dev
```

## 2. Ejecución local

```bash
pnpm dev
```
Acceder a `http://localhost:3000/login`.
