# Plan: Autenticación obligatoria con Better Auth

**Código**: `400-better-auth-login` | **Fecha**: 2026-11-09

---

## 1. Estrategia de implementación

El plan de trabajo se divide en etapas incrementales:

1. **Configuración de Better Auth**: Instalar Better Auth, configurar adaptador PostgreSQL contra Supabase, definir handler de API.
2. **Esquema y Migración**: Crear tablas de usuarios, sesiones y cuentas mediante Better Auth y actualizar RLS de `tasks` para asociar `owner_id`.
3. **UI/UX Login/Registro**: Crear páginas, formularios, validaciones, reCAPTCHA y componentes de tema.
4. **Funcionalidad Auth**: Conectar formularios con Better Auth, implementar flujo de registro, login, "recordar usuario" y recuperación de contraseña (código email con Resend).
5. **Middleware de Seguridad**: Middleware en Next.js para proteger rutas y redirigir a `/login`.
6. **Migración de Datos**: (Opcional) decisión de qué hacer con las tareas locales previas.
7. **QA**: Validaciones de seguridad, flujos completos de login, registro, reset password y pruebas de persistencia.

---

## 2. Cronograma de trabajo

| Etapa | Descripción | Esfuerzo |
|-------|-------------|----------|
| 1-2 | Backend Auth y Migración BD | Medio |
| 3-4 | UI y Lógica de Registro/Login | Medio |
| 5-6 | Middleware y Protección | Bajo |
| 7 | QA Final | Medio |
