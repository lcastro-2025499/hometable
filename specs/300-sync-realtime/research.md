# Research: Sincronización en tiempo real y multi-dispositivo

**Código**: 300-sync-realtime | **Fecha**: 2026-11-04 | **Estado**: Implementado (2026-11-09)

---

## 0. Preguntas sin resolver

| Pregunta | Estado | Respuesta |
|----------|--------|-----------|
| ¿Qué tipo de cuenta de Supabase crear? | ✅ Resuelta | Proyecto gratuito en Supabase.com |
| ¿Cómo manejar usuarios sin cuenta? | ✅ Resuelta | Modo invitado/anónimo con datos públicos |
| ¿Qué hacer con datos localStorage existentes? | ✅ Resuelta | Ofrecer sincronización manual al iniciar |
| ¿Cómo manejar conflictos de sincronización? | ✅ Resuelta | Timestamp `updated_at` como resolutor |

---

## 1. Investigación de Supabase

### 1.1 Plan gratuito (Free Tier)

| Recurso | Límite | Comentario |
|---------|--------|------------|
| Base de datos | 500 MB | Suficiente para miles de tableros |
| Rows (registros) | 500,000/mes | ~17,000 tasks/día |
| Realtime mensajes | 500,000/mes | Cambios sincronizados |
| API requests | 2,000,000/mes | Búsquedas y cargas |
| Auth usuarios | 5,000 | Con futuro plan pagado |
| Edge Functions | 125,000 invocaciones | Para lógica adicional |

**Conclusión**: El plan gratuito cubre el MVP sin costo.

### 1.2 Estructura de Realtime en Supabase

Supabase Realtime funciona mediante:
- **Channels**: Canales pub/sub para cada tabla
- **Broadcast**: Mensaje enviado a todos los suscriptores
- **Presence**: Estado de conexión de usuarios

**Ejemplo de uso**:
```typescript
const channel = supabase.channel('public:tasks')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tasks'
  }, (payload) => {
    // payload.new o payload.old
  })
  .subscribe()
```

### 1.3 Límites de WebSocket en Vercel

Vercel no permite servidores WebSocket persistentes en el plan Hobby. Soluciones:
1. **External**: Supabase Realtime (WebSocket propios) ✅
2. **External**: Pusher/Ably (servicios de pago) ❌ (presupuesto $0)
3. **Internal**: usar API routes con WebSocket → no funciona bien en Vercel ❌

**Decisión**: Usar Supabase Realtime (solución externa, gratuita).

---

## 2. Alternativas de base de datos

### 2.1 Comparativa

| Base de datos | Costo | WebSocket | Límites gratuitos | Recomendación |
|---------------|-------|-----------|-------------------|---------------|
| Supabase | Gratis | ✅ | 500k msgs/mes | ✅ **Mejor opción** |
| Firebase | Gratis* | ✅ | 50k lecturas/día | ⚠️ Límite bajo |
| Neon.tech | Gratis* | ❌ | 20k invocaciones | ❌ Sin Realtime |
| PlanetScale | Gratis* | ❌ | 5GB datos | ❌ Sin Realtime |
| Railway | Gratis* | ✅ (Socket.io) | 500h/mes | ❌ No compatible Vercel |

**Conclusión**: Supabase es la única opción que cumple con WebSocket + gratuito + compatible Vercel.

---

## 3. Consideraciones técnicas

### 3.1 UUID v4 para IDs

Pregunta: ¿Generar UUID en cliente o en BD?

| Opción | Pros | Contras |
|--------|------|---------|
| Cliente | Menos roundtrips | Puede haber colisiones |
| BD | Garantizado único | Necesita 2 calls (insert + fetch) |

**Decisión**: Generar UUID v4 en cliente usando `crypto.randomUUID()` (ya usado en la app).

### 3.2 Sincronización de orden

El campo `order` es crítico para el drag-and-drop. Necesitamos:

```sql
-- Estrategia: Reordenar en lote al soltar
UPDATE tasks SET "order" = 0 WHERE id = 'a';
UPDATE tasks SET "order" = 1 WHERE id = 'b';
UPDATE tasks SET "order" = 2 WHERE id = 'c';
```

**Problema**: Esto genera 3 llamadas a la API.

**Solución alternativa**: Endpoint batch update vía Supabase RPC (función SQL).

### 3.3 Timestamps y sincronización

Para evitar conflictos, usamos:
- `created_at`: Timestamp inicial (auto en BD)
- `updated_at`: Timestamp de última modificación (trigger)
- `completed_at`: Timestamp de cuando se marcó done

---

## 4. Migración de datos: escenarios

### Escenario A: Usuario nuevo

```
App arranca → No hay localStorage → Llamada a Supabase GET /tasks → Si vacío, crear tabla vacía
```

### Escenario B: Usuario existente con localStorage

```
App arranca → Hay localStorage → Intentar conectar a Supabase → Si conecta → Preguntar "Sincronizar mis datos?" → Si sí → upsert → Limpiar localStorage
```

### Escenario C: Sin conexión

```
App arranca → Falla conexión a Supabase → Usar localStorage → Mostrar badge "Offline" → Cuando vuelva conexión → Preguntar sincronizar
```

---

## 5. Decisiones técnicas

| Tema | Decisión | Justificación |
|------|----------|---------------|
| Base de datos | Supabase | WebSocket gratuito, compatible Vercel |
| WebSocket | Supabase Realtime | No requiere autohospedaje |
| Auth | Modo invitado | Sin cuentas para MVP |
| ID | UUID v4 cliente | Ya implementado |
| Orden | Update individual | Simple, suficiente para MVP |
| Conflictos | Timestamp | Último cambio gana |

---

## 6. Próximos pasos

Todos los pasos del diseño inicial se completaron:

1. ✅ Proyecto Supabase creado (`tfjbkvxxdglxujnrcaeb`).
2. ✅ Tabla `tasks` y migración versionada aplicadas.
3. ✅ Cliente Supabase singleton nullable.
4. ✅ Hook `use-supabase`.
5. ✅ Store con métodos remotos y sincronización de todas las mutaciones.
6. ✅ UI de estado de conexión y diálogo de migración.
7. ✅ Migración `taskboard:v1` → `taskboard:v2` y cola offline.

## 7. Resultados de la implementación

| Tema | Resultado |
|------|-----------|
| Dependencia | `@supabase/supabase-js` 2.118.0 |
| Esquema | Tabla, trigger, índices, RLS, `GRANT` y publicación Realtime |
| REST | INSERT 201, UPDATE 200, SELECT 200, DELETE 200 |
| Realtime | INSERT, UPDATE y DELETE recibidos por WebSocket |
| Reconciliación | Por `updatedAt`, con cola offline y diálogo para tareas solo locales |
| Fallback | Cliente nullable; sin variables la app funciona en modo local |
| Puertas | `pnpm lint`, `next typegen`, `tsc --noEmit` y `pnpm build` en verde |

### 7.1 Hallazgo importante: permisos además de RLS

Las políticas RLS existían, pero el rol `anon` no tenía privilegios sobre la tabla y
PostgREST devolvía `42501 permission denied for table tasks`. Se corrigió con:

```sql
grant select, insert, update, delete on table public.tasks to anon, authenticated;
```

### 7.2 Hallazgo importante: carrera al conectar Realtime

Insertar justo en el callback `SUBSCRIBED` puede perder el evento porque la conexión
de replicación aún está arrancando. La app no depende de ese evento inmediato: hace
una carga inicial por REST y después escucha cambios. La prueba de QA espera unos
segundos tras la suscripción antes de escribir.

### 7.3 Decisión sobre el trigger `updated_at`

Se mantiene el trigger del servidor, pero el cliente también envía `updatedAt` para
conservar el orden de cambios. En un UPDATE gana la hora del servidor; el payload de
Realtime actualiza el estado local con ese valor.