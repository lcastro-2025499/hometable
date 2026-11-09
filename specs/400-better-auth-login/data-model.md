# Modelo de Datos: Autenticación con Better Auth y Tableros

**Código**: `400-better-auth-login` | **Fecha**: 2026-11-09

---

## 1. Esquema de Tablas para Better Auth

Better Auth gestiona las siguientes tablas en PostgreSQL / Supabase:

### `user`
- `id` (text, primary key)
- `name` (text, not null) - Nombres + Apellidos
- `username` (text, unique, not null) - Mínimo 3, máximo 15 caracteres
- `email` (text, unique, not null)
- `emailVerified` (boolean, default false)
- `image` (text, nullable)
- `createdAt` (timestamp, not null)
- `updatedAt` (timestamp, not null)

### `session`
- `id` (text, primary key)
- `userId` (text, not null, references user.id)
- `token` (text, unique, not null)
- `expiresAt` (timestamp, not null)
- `ipAddress` (text, nullable)
- `userAgent` (text, nullable)
- `createdAt` (timestamp, not null)
- `updatedAt` (timestamp, not null)

### `account`
- `id` (text, primary key)
- `userId` (text, not null, references user.id)
- `accountId` (text, not null)
- `providerId` (text, not null)
- `password` (text, nullable)
- `createdAt` (timestamp, not null)
- `updatedAt` (timestamp, not null)

### `verification`
- `id` (text, primary key)
- `identifier` (text, not null)
- `value` (text, not null) - Código de verificación de 6 dígitos para reset de contraseña
- `expiresAt` (timestamp, not null)
- `createdAt` (timestamp, not null)
- `updatedAt` (timestamp, not null)

---

## 2. Preparación para Futuras Funcionalidades Multi-tablero

Para soportar en el futuro hasta 2 tableros (1 personal y 1 invitado), la tabla `public.tasks` se vinculará a un tablero (`board_id`), y el campo `owner_id` apuntará al `user.id` de Better Auth.

### `board` (preparado para futuro)
- `id` (uuid, primary key, default gen_random_uuid())
- `name` (text, not null)
- `owner_id` (text, not null, references user.id)
- `type` (text, check type in ('personal', 'invited'))
- `created_at` (timestamptz, default now())

### Modificación a `public.tasks`
- `owner_id` (text, not null, references user.id)
- `board_id` (uuid, nullable)
