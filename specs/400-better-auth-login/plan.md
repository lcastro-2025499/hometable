# Plan: Autenticación obligatoria con Better Auth

**Código**: `400-better-auth-login` | **Fecha**: 2026-11-09 | **Actualizado**:
2026-11-11 | **Especificación**: [spec.md](./spec.md)

---

## 1. Estrategia de implementación

1. **Better Auth sobre PostgreSQL**: pool único de `pg`, adaptador de base de datos,
   `baseURL` canónica, orígenes de confianza y `disableSignUp: true`.
2. **Esquema**: tablas de Better Auth, `pending_registration`, `board`,
   `auth_rate_limit`, `owner_id` y RLS, en migraciones ordenadas y reproducibles.
3. **Registro diferido**: `/api/auth/register` valida reCAPTCHA y rate limit, guarda
   el pendiente y envía el OTP. `/api/auth/verify-email` confirma y crea la cuenta.
4. **UI**: `/login`, `/register`, `/verify-email` y `/forgot-password` con React Hook
   Form + Zod, shadcn/ui, reCAPTCHA y temas.
5. **Protección de rutas**: `src/proxy.ts` comprueba la cookie y aplica CSP; las
   páginas de servidor validan la sesión real con `getSession()`.
6. **Seguridad**: rate limit persistente, mismo origen, cookie firmada del pendiente,
   mensajes genéricos y revocación de escrituras en PostgREST.
7. **Verificación**: lint, typegen, tipos, Vitest, build, CI y QA manual.

---

## 2. Contexto técnico

- **Runtime**: Node.js 22 y pnpm 12.
- **Framework**: Next.js 16 App Router, React 19, TypeScript estricto.
- **Auth**: Better Auth 1.7.x con adaptador `pg` sobre el pooler de Supabase.
- **Base de datos**: PostgreSQL; migraciones en `supabase/migrations/`.
- **Correo**: Resend con dominio verificado y sin remitente de respaldo.
- **reCAPTCHA**: v2 Checkbox; el token se valida en el servidor.
- **Validación**: Zod 4 en cliente y servidor.
- **Pruebas**: Vitest 3; CI en GitHub Actions.

---

## 3. Verificación constitucional

- **I. Dominio tipado**: `auth-validation.ts` comparte los esquemas entre formularios
  y rutas; `pnpm test` cubre contraseñas, email, registro, reset y OTP.
- **II. Fuente de verdad**: la identidad vive en PostgreSQL; el cliente nunca
  escribe en las tablas de Better Auth.
- **III. UI**: textos en español, foco visible, `aria-invalid`, mensajes de error y
  selector de tema.
- **IV. Fronteras**: la sesión se lee con `getSession()` en el servidor; el cliente
  solo usa `authClient` para iniciar/cerrar sesión y recuperar contraseña.
- **V. Seguridad**: `disableSignUp`, verificación obligatoria, OTP hasheado con
  caducidad e intentos, rate limit persistente, mismo origen y CSP con nonce.
- **VI. Realtime**: el token de Realtime exige sesión y correo verificado, pero las
  escrituras siguen por `/api/tasks`.
- **VII. Verificación**: puertas automatizadas + QA manual documentado.

Sin violaciones: el plan cumple la constitución v3.0.0.

---

## 4. Fases

### Fase 0: Configuración

- [x] Instalar `better-auth` y usar el pool de `pg`.
- [x] Handler en `src/app/api/auth/[...all]/route.ts`.
- [x] `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` y orígenes de confianza.
- [x] `disableSignUp: true`, `requireEmailVerification: true` y sesión de 7 días.

### Fase 1: Persistencia

- [x] Migración `20261109151500_better_auth_tables.sql` con `user`, `session`,
  `account`, `verification`, `board` y `owner_id`.
- [x] Migración `20261110161929_enable_rls_auth_tables.sql`.
- [x] Migración `20261110200442_pending_registrations.sql`.
- [x] Migración `20261111162025_auth_rate_limit.sql`.

### Fase 2: Registro y verificación

- [x] `src/lib/pending-registration.ts`: alta «el último gana», purga, OTP, intentos,
  verificación atómica y creación de `user` + `account`.
- [x] `src/lib/pending-cookie.ts`: cookie httpOnly firmada.
- [x] `/api/auth/register`, `/api/auth/verify-email` y
  `/api/auth/resend-verification`.
- [x] `src/lib/recaptcha.ts` y `src/lib/email.ts` fail-closed.

### Fase 3: UI

- [x] `/login` con correo o usuario y «Recordarme».
- [x] `/register` con reCAPTCHA y validación en vivo.
- [x] `/verify-email` con OTP, reenvío y cooldown.
- [x] `/forgot-password` con enlace/código y `?token=`/`?error=`.
- [x] `useRedirectIfAuthenticated` para no crear bucles con cookies caducadas.

### Fase 4: Protección y seguridad

- [x] `src/proxy.ts` con rutas públicas exactas y CSP con nonce.
- [x] `getSession()` en `/`, `/api/tasks` y `/api/realtime/token`.
- [x] Mismo origen en escrituras.
- [x] Rate limit persistente y mensajes genéricos.
- [x] RLS y revocación de privilegios en PostgREST.

### Fase 5: Verificación

- [x] `pnpm lint`.
- [x] `pnpm exec next typegen`.
- [x] `pnpm exec tsc --noEmit`.
- [x] `pnpm test`.
- [x] `pnpm build`.
- [x] CI en `.github/workflows/ci.yml`.
- [x] QA manual de registro, OTP, login, recuperación y cierre de sesión.

---

## 5. Riesgos y mitigaciones

- **Enumeración de correos**: mensajes genéricos en registro y reenvío.
- **Altas saltándose reCAPTCHA**: `disableSignUp: true` elimina el endpoint de alta
  de Better Auth.
- **Fuerza bruta**: rate limit persistente en Postgres, compartido entre instancias.
- **OTP filtrado**: hash en base de datos, caducidad de 10 minutos, 5 intentos y
  cookie firmada que vincula el pendiente al navegador.
- **Cookie caducada**: `proxy.ts` no redirige a `/` solo por tener cookie; las
  páginas públicas comprueban la sesión real en el cliente.
- **CSP bloqueando reCAPTCHA o WebSocket**: allowlist explícita y nonce por
  petición.
- **Migraciones divergentes**: archivos locales con las versiones remotas.
- **Build sin base de datos**: la validación de esquema de Better Auth se desactiva
  durante `next build`; en ejecución sigue activa.

---

## 6. Verificación

| Comando | Resultado esperado |
| --- | --- |
| `pnpm lint` | Sin errores |
| `pnpm exec next typegen` | Tipos generados |
| `pnpm exec tsc --noEmit` | Sin errores |
| `pnpm test` | 46 pruebas en verde |
| `pnpm build` | Build correcto |
| CI | Las cinco puertas en verde |

---

## 7. Seguimiento

- [x] Especificación y plan aprobados.
- [x] Implementación completa.
- [x] Pruebas y CI.
- [x] QA manual.
- [x] Despliegue en Vercel con dominio propio.
