# Especificación: Autenticación obligatoria con Better Auth y Supabase

**Código**: `400-better-auth-login` | **Fecha**: 2026-11-09  
**Proyecto Supabase**: `tfjbkvxxdglxujnrcaeb`

---

## 1. Resumen y objetivos

Implementar un sistema de autenticación robusto basado en **Better Auth** con adaptador PostgreSQL conectado a Supabase, haciendo que el acceso al tablero de tareas sea **obligatorio**. Asimismo, preparar el terreno para las características futuras solicitadas (máximo 2 tableros, invitaciones, chat y cambio de nombre de usuario).

### Objetivos clave
1. **Login obligatorio**: Redirección automática de usuarios no autenticados a `/login`.
2. **Autenticación por email y contraseña** utilizando Better Auth en API Routes de Next.js.
3. **Registro completo**: Nombres, apellidos, nombre de usuario (3-15 chars), email, contraseña (mínimo 8 caracteres, 1 mayúscula, 2 números), confirmar contraseña y **Google reCAPTCHA v2 Checkbox**. El botón de registro se mantiene deshabilitado hasta que todos los campos sean válidos, las contraseñas coincidan y el reCAPTCHA esté aprobado.
4. **Recordar usuario**: Opción de “Recordarme” en el login/sesión con duración de 7 días mediante cookie HttpOnly.
5. **Recuperación de contraseña**: Envío de código de verificación de 6 dígitos por correo electrónico utilizando **Resend** (gratuito).
6. **Diseño consistente**: Vistas de `/login`, `/register` y `/forgot-password` alineadas con la estética de shadcn/ui y soporte para cambio de tema claro/oscuro.

---

## 2. Requisitos funcionales

- **RF-01**: Ningún usuario puede acceder al tablero (`/`) sin una sesión activa de Better Auth.
- **RF-02**: El formulario de registro valida:
  - Nombres y Apellidos no vacíos.
  - Nombre de usuario único, longitud entre 3 y 15 caracteres.
  - Email válido.
  - Contraseña con mínimo 8 caracteres, al menos 1 mayúscula y al menos 2 números.
  - Coincidencia exacta entre contraseña y confirmación.
  - Verificación exitosa de Google reCAPTCHA v2 Checkbox en servidor y cliente.
- **RF-03**: El botón de registro permanece inactivo si alguna validación falla.
- **RF-04**: Tras un registro exitoso, se redirige automáticamente a `/login`.
- **RF-05**: El login valida credenciales y ofrece un checkbox “Recordarme” (7 días de vigencia de sesión).
- **RF-06**: Recuperación de contraseña solicita el email, genera y envía un código de verificación por correo (Resend), permitiendo establecer una nueva contraseña.
- **RF-07**: Las vistas de autenticación disponen de enlaces cruzados (ir de login a registro, de registro a login, y recuperación de contraseña desde login) y selector de tema claro/oscuro.

---

## 3. Requisitos no funcionales

- **RNF-01**: Seguridad de credenciales: hashes seguros con Better Auth, sin exposición de secretos ni claves de servicio en el cliente.
- **RNF-02**: Tipado estricto con TypeScript y validación robusta con Zod en cliente y servidor.
- **RNF-03**: Accesibilidad y cumplimiento de componentes UI de shadcn.
