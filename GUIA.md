# Guía de configuración: Supabase y sincronización en tiempo real

Esta guía explica cómo activar la sincronización multi-dispositivo de Hometable.
La app funciona sin Supabase en modo local; estos pasos son opcionales.

**Proyecto actual de referencia**: `tfjbkvxxdglxujnrcaeb` (Supabase) y
`hometable-tasks` (Vercel).

---

## 1. Requisitos

- Cuenta en <https://supabase.com> (plan gratuito suficiente).
- Proyecto de Supabase creado.
- Node.js 22 y pnpm instalados.

---

## 2. Obtener credenciales

1. Entra en el proyecto de Supabase.
2. Ve a **Settings → API**.
3. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** o **publishable key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> La clave `anon` es pública por diseño. No uses en el cliente la
> `service_role key`: se salta RLS y nunca debe exponerse.

---

## 3. Configurar `.env.local`

En la raíz del repositorio, copia `.env.example`:

```bash
cp .env.example .env.local
```

Rellena los valores:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-publica
```

Comprueba que `.env.local` está ignorado por git:

```bash
git check-ignore .env.local
```

---

## 4. Aplicar la migración

La fuente de verdad es
`supabase/migrations/20261109000000_align_tasks_schema.sql`. Es idempotente y crea
todo lo necesario:

- tabla `tasks` y restricciones;
- trigger `updated_at`;
- índices;
- RLS con políticas públicas de MVP;
- permisos para `anon` y `authenticated`;
- publicación `supabase_realtime`.

### Opción A: Supabase CLI

```bash
supabase link --project-ref tu-project-ref
supabase db push
```

### Opción B: SQL Editor

1. Abre **SQL Editor** en Supabase.
2. Pega el contenido completo de la migración.
3. Pulsa **Run**.

Si el proyecto ya tenía la tabla, la migración la alinea sin borrar datos.

---

## 5. Ejecutar y verificar

```bash
pnpm install
pnpm dev
```

Abre <http://localhost:3000> y comprueba el badge de estado:

| Estado | Significado |
|--------|-------------|
| Solo local | Faltan variables de entorno |
| Conectando | Estableciendo conexión |
| Sincronizado | REST y Realtime funcionando |
| Sin conexión | Offline; los cambios van a la cola |
| Error | Fallo de sincronización; se reintenta |

Prueba rápida:

1. Abre dos pestañas del tablero.
2. Crea una tarea en una pestaña.
3. Debe aparecer en la otra sin recargar.
4. Arrastra la tarea y comprueba que el movimiento también se replica.

La prueba detallada está en `specs/300-sync-realtime/quickstart.md` y el registro de
resultados en `specs/300-sync-realtime/QA.md`.

---

## 6. Desplegar en Vercel

1. Importa el repositorio en <https://vercel.com/new>.
2. Mantén la configuración detectada (Next.js, `pnpm build`).
3. En **Settings → Environment Variables**, añade para Production, Preview y
   Development:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Despliega. Cada push a `master` genera un despliegue automático.

Sin esas variables el despliegue funciona, pero en modo local.

---

## 7. Problemas frecuentes

### `42501 permission denied for table tasks`

RLS no es suficiente: faltan permisos sobre la tabla. La migración incluye:

```sql
grant select, insert, update, delete on table public.tasks to anon, authenticated;
```

### Realtime conecta pero no llegan eventos

1. Comprueba que `tasks` está en la publicación:

   ```sql
   select * from pg_publication_tables
   where pubname = 'supabase_realtime' and tablename = 'tasks';
   ```

2. Comprueba que RLS y los `GRANT` están aplicados.
3. Ten en cuenta que la conexión de replicación tarda un instante en arrancar tras
   el join. La app hace una carga inicial por REST, así que no depende de eventos
   inmediatos.

### Los datos no aparecen en otro dispositivo

- Verifica que ambos usan la misma URL y clave.
- Comprueba el badge: debe decir "Sincronizado".
- Revisa la consola del navegador y la pestaña Network → WS.

### Datos antiguos en `taskboard:v1`

La app copia `taskboard:v1` a `taskboard:v2` automáticamente y conserva `v1` como
respaldo. Si hay tareas que solo existen en local, aparece el diálogo para subirlas.

---

## 8. Seguridad y costos

- RLS está habilitado con políticas públicas de MVP: cualquier cliente con la URL
  puede leer y escribir. No es un tablero privado.
- No hay autenticación individual todavía. `owner_id` está preparado para una fase
  futura con políticas `auth.uid() = owner_id`.
- Nunca subas `.env.local` ni claves secretas al repositorio.
- Plan gratuito de Supabase: 500 MB de base de datos y 500k mensajes Realtime/mes,
  más que suficiente para este MVP.

---

## 9. Checklist

- [ ] Proyecto de Supabase disponible.
- [ ] Variables públicas en `.env.local`.
- [ ] Migración aplicada (tabla, trigger, índices, RLS, `GRANT`, Realtime).
- [ ] `pnpm dev` muestra el badge "Sincronizado".
- [ ] Crear/editar/mover/borrar se replica entre dos pestañas.
- [ ] Variables configuradas en Vercel.
- [ ] `pnpm lint`, `pnpm exec tsc --noEmit` y `pnpm build` en verde.
