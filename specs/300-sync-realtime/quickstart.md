# Quickstart: Sincronización en tiempo real y multi-dispositivo

**Código**: 300-sync-realtime | **Fecha**: 2026-11-04 | **Actualizado**: 2026-11-11
| **Estado**: Implementado y en producción

---

## 1. Prerequisitos

### 1.1 Supabase

1. Crear una cuenta en <https://supabase.com> si no existe.
2. Usar el proyecto actual `tfjbkvxxdglxujnrcaeb` o crear uno nuevo con plan
   gratuito.
3. Obtener credenciales en **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL` (URL del proyecto, sin barra final).
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clave `anon` o publicable).
   - `SUPABASE_JWT_SECRET` (JWT Settings; solo servidor).
4. Obtener la cadena del pooler en **Project Settings → Database**:
   - `DATABASE_URL` con host `*.pooler.supabase.com`, puerto `6543`, modo
     transaction.
   - Opcional: `DIRECT_URL` para migraciones locales.
5. (Opcional, recomendado) Descargar la CA en **SSL Configuration** y guardarla en
   `SUPABASE_DB_CA_CERT` con los saltos de línea escapados como `\n`.

### 1.2 Variables de entorno

Copiar `.env.example` a `.env.local` y rellenar:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-public-key]
SUPABASE_JWT_SECRET=[jwt-secret]
DATABASE_URL=postgresql://postgres.[ref]:[password]@[region].pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres
SUPABASE_DB_CA_CERT=

# Better Auth
BETTER_AUTH_SECRET=[32+ caracteres aleatorios]
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_TRUSTED_ORIGINS=

# reCAPTCHA y correo
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=[site-key]
RECAPTCHA_SECRET_KEY=[secret-key]
RESEND_API_KEY=re_[...]
EMAIL_FROM=no-reply@[dominio-verificado]
```

### 1.3 Base de datos

Aplicar las migraciones de `supabase/migrations/` en orden:

```bash
# Con la CLI de Supabase vinculada al proyecto
supabase db push
```

O copiar cada archivo en **SQL Editor → Run**, empezando por
`20261109151132_align_tasks_schema_and_realtime.sql` y terminando por
`20261112040000_tasks_owner_not_null_and_board_index.sql`.

> **Importante**: los nombres de archivo usan las mismas versiones que el historial
> remoto. No apliques DDL desde el panel sin crear antes el archivo local
> correspondiente; eso reintroduce divergencia entre el repositorio y el proyecto.

La migración deja:

- `public.tasks` con `owner_id NOT NULL` y FK a `public."user"`.
- Trigger `update_tasks_updated_at` con `search_path = ''`.
- Índices `(owner_id, status, "order")` y `(owner_id, created_at desc)`.
- RLS de solo lectura por `auth.jwt() ->> 'sub'` para `authenticated`.
- `tasks` en la publicación `supabase_realtime` con `REPLICA IDENTITY FULL`.
- Tablas de Better Auth, `pending_registration`, `auth_rate_limit` y `board` sin
  grants públicos.

---

## 2. Instalación y puertas

```bash
pnpm install
pnpm exec next typegen
pnpm exec tsc --noEmit
pnpm lint
pnpm test
pnpm build
pnpm dev
```

La aplicación estará en <http://localhost:3000>. Sin sesión, `/` redirige a
`/login`; sin correo verificado, redirige a `/verify-email`.

---

## 3. Pruebas manuales (QA)

### Caso 0: sesión y persistencia

1. Registrarse, recibir el OTP y verificar el correo.
2. Iniciar sesión y comprobar que el tablero carga desde el servidor.
3. Crear, editar, duplicar y borrar una tarea.
4. Recargar: las tareas y el orden se conservan (vienen de PostgreSQL).

### Caso 1: dos pestañas o dispositivos

1. Abrir `http://localhost:3000` en dos ventanas con la misma cuenta.
2. Crear una tarea en A: aparece en B sin recargar.
3. Arrastrarla a «En progreso» en A: se mueve en B.
4. Editar en B: el cambio llega a A.
5. Borrar en A: desaparece en B.

### Caso 2: Realtime deshabilitado

1. Vaciar temporalmente `SUPABASE_JWT_SECRET` o `NEXT_PUBLIC_SUPABASE_URL` y
   reiniciar.
2. El tablero sigue funcionando; el sondeo de 30 s propaga los cambios.
3. Restaurar las variables: el canal vuelve a conectarse y resincroniza.

### Caso 3: sesión caducada

1. Cerrar la sesión en el servidor o borrar la cookie de sesión.
2. Intentar crear o borrar una tarea.
3. La app recibe `401`, cierra la sesión y redirige a `/login`.

### Caso 4: aislamiento entre cuentas

1. Crear dos cuentas verificadas.
2. Con la cuenta A, comprobar que no aparecen tareas de B.
3. Intentar `GET /api/tasks` con la cookie de A y comprobar que solo devuelve las
   tareas de A.
4. En Supabase, verificar que la policy de Realtime solo entrega filas cuyo
   `owner_id` coincide con `sub`.

### Caso 5: rendimiento y accesibilidad

1. Cargar 100+ tareas y medir la carga inicial (objetivo < 2 s).
2. Realizar diez movimientos de drag & drop sin lag perceptible.
3. Probar ratón, táctil y teclado; comprobar los anuncios ARIA y «Mover a».
4. Revisar temas claro, oscuro y sistema, y el diseño responsive.
5. Consola del navegador sin errores.

---

## 4. Verificación de estado

| Estado | Badge | Significado |
|--------|-------|-------------|
| Cargando | Esqueleto | Primera lectura de `/api/tasks` |
| Conectado | «Sincronizado» + hora | Realtime activo o sondeo correcto |
| Sin conexión | «Sin conexión» | El navegador no alcanza el servidor |
| Error | Rojo con tooltip | Fallo de lectura/escritura; se reintenta |

El badge es informativo: la edición no se bloquea por él.

---

## 5. Depuración

### 5.1 Suscripción Realtime

- DevTools → Network → WS: buscar
  `wss://[proyecto].supabase.co/realtime/v1/websocket`.
- Pestaña Console: mensajes `[realtime]` del hook.
- Supabase Dashboard → Realtime Inspector: canales activos y eventos.
- Si el canal no se autentica, revisar `SUPABASE_JWT_SECRET` y que
  `/api/realtime/token` responda `200`.

### 5.2 Datos en Supabase

- Table Editor → `tasks`: comprobar filas, `owner_id`, fechas y orden.
- SQL Editor:

```sql
select id, title, owner_id, due_date, "order", updated_at
from public.tasks
order by updated_at desc
limit 20;
```

### 5.3 Comprobar que no hay persistencia local de tareas

```javascript
// En la consola del navegador
Object.keys(localStorage);
// Solo debería aparecer la clave del tema.
```

### 5.4 Comprobar la API

```bash
curl -i http://localhost:3000/api/tasks
# Sin cookie: 401 JSON
```

---

## 6. Límites del plan gratuito

| Recurso | Límite mensual | Uso estimado |
|---------|----------------|--------------|
| Database size | 500 MB | ~5 MB |
| Realtime messages | 500 000 | ~10 000 operaciones/mes |
| API requests | 2 000 000 | Lecturas, sondeo y escrituras |

**Conclusión**: suficiente para el producto actual.

---

## 7. Checklist

### Verificado automáticamente

- [x] Esquema, trigger, índices, RLS y publicación Realtime aplicados.
- [x] Migraciones ordenadas y reproducibles.
- [x] API autenticada: `401` sin sesión, `403` sin verificar y `403` desde otro
  origen.
- [x] Realtime: INSERT, UPDATE y DELETE recibidos por WebSocket.
- [x] Aislamiento por `owner_id` y `sub`.
- [x] `pnpm lint`, `next typegen`, `tsc --noEmit`, `pnpm test` y `pnpm build` en
  verde.
- [x] CI configurada.

### Verificado manualmente

- [x] Tablero funcional y persistencia tras recargar.
- [x] Sincronización entre dos dispositivos el 11/11/2026.
- [x] Escrituras correctas con Realtime deshabilitado.
- [x] Aislamiento entre cuentas.
- [x] Cabeceras de seguridad sin bloquear reCAPTCHA ni el WebSocket.

Los detalles están en `QA.md`.
