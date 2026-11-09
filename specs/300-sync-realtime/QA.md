# QA: Sincronización en tiempo real y multi-dispositivo

**Código**: 300-sync-realtime | **Fecha**: 2026-11-09
**Proyecto Supabase**: `tfjbkvxxdglxujnrcaeb`
**Entorno**: local (`pnpm`), API REST y Realtime reales contra Supabase.

---

## 1. Alcance y método

El proyecto no tiene navegador ni Playwright disponibles en el entorno del agente.
Por eso el QA se dividió en dos partes:

1. **Automatizado / por API**: puertas de calidad, REST y Realtime reales.
2. **Visual manual**: interacción en navegador, pendiente de una persona.

---

## 2. Puertas de calidad

| Comando | Resultado |
|---------|-----------|
| `pnpm lint` | ✅ Sin errores ni warnings |
| `pnpm exec next typegen` | ✅ Tipos generados |
| `pnpm exec tsc --noEmit` | ✅ Sin errores |
| `pnpm build` | ✅ Build de producción correcto |

Build de Next.js 16.4.3 con Turbopack; rutas `/` y `/_not-found` prerenderizadas.

---

## 3. Esquema de base de datos

Verificado en el proyecto real:

- [x] Tabla `public.tasks` con `id`, `title`, `description`, `status`, `priority`,
  `due_date`, `tags`, `order`, `created_at`, `updated_at`, `completed_at`,
  `owner_id`.
- [x] `description` nullable; `tags` `NOT NULL DEFAULT '{}'`; `order` integer.
- [x] CHECK de `status`, `priority` y `due_date`.
- [x] Índices `idx_tasks_status`, `idx_tasks_order`, `idx_tasks_due_date`,
  `idx_tasks_status_order`.
- [x] Trigger `update_tasks_updated_at`.
- [x] RLS habilitado con políticas `public select/insert/update/delete`.
- [x] `GRANT select, insert, update, delete` a `anon` y `authenticated`.
- [x] `tasks` en `pg_publication_tables` de `supabase_realtime`.
- [x] Migración idempotente y reproducible desde un proyecto vacío.

### 3.1 Hallazgo: `42501 permission denied`

Las políticas RLS existían, pero faltaban los privilegios de tabla. Sin el `GRANT`,
PostgREST devolvía `401` con código `42501`. Se corrigió en la migración y se repitió
la prueba con éxito.

---

## 4. API REST

Prueba real con la clave pública (`anon`) sobre `https://tfjbkvxxdglxujnrcaeb.supabase.co`.

| Operación | Resultado | Detalle |
|-----------|-----------|---------|
| INSERT sin `description` | ✅ `201` | `description: null`, `tags: ["qa"]`, `order: 0` |
| UPDATE `title`/`status`/`completed_at` | ✅ `200` | Cambio aplicado y devuelto |
| SELECT por `id` | ✅ `200` | Fila recuperada correctamente |
| DELETE por `id` | ✅ `200` | Fila eliminada |

Se verificó que la tabla quedó vacía después de las pruebas.

---

## 5. Realtime (WebSocket)

Prueba con `@supabase/supabase-js` 2.118.0 en Node 24, usando el cliente público y
un canal `public:tasks` con `postgres_changes`.

### Resultado

| Evento | Recibido | Payload |
|--------|----------|---------|
| INSERT | ✅ | `id` de la tarea creada |
| UPDATE | ✅ | `id` y nuevo `title` |
| DELETE | ✅ | `id` de la tarea eliminada |

```json
{
  "insertOk": true,
  "updateOk": true,
  "deleteOk": true
}
```

### 5.1 Hallazgo: carrera al conectar

En el primer intento se insertó justo en el callback `SUBSCRIBED` y no llegó ningún
evento. Los logs de Realtime mostraron que la conexión de replicación se estableció
un instante después de la escritura. Al esperar ~3 segundos tras la suscripción, los
tres eventos llegaron correctamente.

**Impacto en la app**: ninguno crítico, porque `use-tasks-sync` hace una carga
inicial por REST antes de depender de Realtime. Los cambios posteriores sí llegan
por WebSocket.

---

## 6. QA visual manual (pendiente)

Requiere navegador y, para el caso 4, dos dispositivos. Marcar al completar:

### Caso 0: tablero y persistencia

- [ ] La app carga sin errores.
- [ ] Crear, editar, duplicar y borrar tareas.
- [ ] Deshacer funciona.
- [ ] Recargar conserva tareas y orden.

### Caso 1: dos pestañas

- [ ] Crear una tarea en A y verla en B sin recargar.
- [ ] Arrastrar en A y ver el movimiento en B.
- [ ] Editar en B y ver el cambio en A.
- [ ] Borrar en A y verla desaparecer en B.

### Caso 2: offline/online

- [ ] DevTools → Network → Offline muestra "Sin conexión".
- [ ] Crear una tarea offline; se guarda en local.
- [ ] Volver a Online; la cola se vacía y la tarea llega a Supabase.
- [ ] El badge vuelve a "Sincronizado".

### Caso 3: migración local

- [ ] Con datos en `taskboard:v1`, recargar y comprobar la copia a `taskboard:v2`.
- [ ] Aparece el diálogo de tareas solo locales.
- [ ] "Subir tareas" las inserta en Supabase.
- [ ] "Ahora no" las conserva en local y permite reabrir el diálogo.

### Caso 4: dos dispositivos

- [ ] Abrir la URL de producción en dos dispositivos.
- [ ] Crear en uno y ver el cambio en el otro.
- [ ] Arrastrar en el segundo y ver el cambio en el primero.

### Caso 5: rendimiento y accesibilidad

- [ ] Cargar 100+ tareas sin lag perceptible.
- [ ] Drag & drop con ratón, táctil y teclado.
- [ ] Anuncios ARIA y menú "Mover a".
- [ ] Temas claro, oscuro y sistema.
- [ ] Responsive en móvil, tableta y escritorio.
- [ ] Consola del navegador sin errores.

---

## 7. Despliegue en Vercel

| Comprobación | Resultado |
|--------------|-----------|
| Deployment de `510008e` | ✅ `READY` (`dpl_DWPoqpGGQJkrdQ3TzqrdCxRTJLDe`) |
| URL de producción | ✅ <https://hometable-tasks.vercel.app> responde `200` |
| Título | ✅ "Tablero de tareas" |
| Variables públicas en el bundle | ✅ URL de Supabase presente |

---

## 8. Conclusión

La capa de datos, los permisos, la migración, la API REST, Realtime y el despliegue de
producción están validados contra el proyecto real. Las puertas de calidad están en
verde. Queda pendiente únicamente el QA visual humano en navegador.
