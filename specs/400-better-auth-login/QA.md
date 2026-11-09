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
