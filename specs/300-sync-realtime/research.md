# Research: Sincronización en tiempo real y multi-dispositivo

**Código**: 300-sync-realtime | **Fecha**: 2026-11-04 | **Actualizado**: 2026-11-11
| **Estado**: Implementado y en producción

---

## 0. Preguntas resueltas

| Pregunta | Estado | Respuesta |
|----------|--------|-----------|
| ¿Qué servicio ofrece Postgres y WebSocket gratis? | ✅ Resuelta | Supabase (PostgreSQL + Realtime). |
| ¿Dónde vive la lógica de escritura? | ✅ Resuelta | En `/api/tasks`, con SQL parametrizado y la sesión de Better Auth. |
| ¿Cómo se autentica Realtime sin exponer el secreto? | ✅ Resuelta | JWT HS256 de 15 min firmado en el servidor. |
| ¿Cómo se limita Realtime a las tareas propias? | ✅ Resuelta | RLS con `owner_id = auth.jwt() ->> 'sub'`. |
| ¿Qué pasa si Realtime falla? | ✅ Resuelta | Sondeo cada 30 s, foco y reconexión. |
| ¿Cómo se resuelven conflictos? | ✅ Resuelta | PostgreSQL es autoritativo; gana la última escritura que llega al servidor. |
| ¿Se conservan los datos locales de la versión 1.x? | ✅ Resuelta | No hay migración automática; el usuario vuelve a introducir sus tareas. |

> La arquitectura inicial (localStorage + cola offline + reconciliación) se
> descartó en la versión 2.0. Las secciones siguientes documentan las decisiones
> vigentes y dejan constancia del cambio.

---

## 1. Investigación de Supabase

### 1.1 Plan gratuito (Free Tier)

| Recurso | Límite | Comentario |
|---------|--------|------------|
| Base de datos | 500 MB | Suficiente para miles de tableros |
| Realtime mensajes | 500 000/mes | Cambios de la cuenta propia |
| API requests | 2 000 000/mes | Cargas y sondeo |
| Auth usuarios | 50 000 MAU | Better Auth usa las tablas, no el Auth de Supabase |
| Edge Functions | 500 000 invocaciones | No se usan en esta versión |

**Conclusión**: el plan gratuito cubre el producto sin costo.

### 1.2 Estructura de Realtime

Supabase Realtime ofrece:

- **Channels**: canales pub/sub por tabla.
- **Broadcast**: mensajes a los suscriptores.
- **Presence**: estado de conexión.

El canal usado por la app es `tasks:<userId>` con `postgres_changes` y filtro
`owner_id=eq.<userId>`. Además, RLS vuelve a comprobar el `sub` del JWT, de modo
que el filtro del cliente no es la única defensa.

### 1.3 Límites de WebSocket en Vercel

Vercel no mantiene servidores WebSocket persistentes en el plan Hobby. Soluciones
evaluadas:

1. **Supabase Realtime** (WebSocket externo gestionado) ✅
2. Pusher/Ably (servicios de pago) ❌
3. WebSocket en API Routes de Vercel ❌

**Decisión**: Supabase Realtime.

---

## 2. Alternativas de base de datos

| Base de datos | Costo | WebSocket | Límites gratuitos | Recomendación |
|---------------|-------|-----------|-------------------|---------------|
| Supabase | Gratis | ✅ | 500k msgs/mes | ✅ **Elegida** |
| Firebase | Gratis* | ✅ | 50k lecturas/día | ⚠️ Modelo NoSQL y límite bajo |
| Neon.tech | Gratis* | ❌ | 20k invocaciones | ❌ Sin Realtime |
| PlanetScale | Gratis* | ❌ | 5 GB | ❌ Sin Realtime |

**Conclusión**: Supabase es la única opción que cumple Postgres + Realtime +
compatibilidad con Vercel sin costo.

---

## 3. Decisiones técnicas

### 3.1 Servidor como única vía de escritura

**Alternativas**:

| Opción | Pros | Contras |
|--------|------|---------|
| PostgREST desde el navegador | Menos código | Expone la tabla, RLS compleja y claves públicas |
| API Routes con `pg` | Dueño derivado de la sesión, SQL parametrizado, auditoría | Una capa más |

**Decisión**: API Routes. El navegador nunca escribe en Postgres y `owner_id` no
puede falsificarse desde el cuerpo de la petición.

### 3.2 Realtime de solo lectura

**Alternativas**:

| Opción | Pros | Contras |
|--------|------|---------|
| Realtime con escrituras | Menos latencia | RLS de escritura por fila, difícil de auditar |
| Realtime de solo lectura | Simple y seguro | Las escrituras siguen por la API |

**Decisión**: solo lectura de las tareas propias. Las escrituras pasan por
`/api/tasks`.

### 3.3 Autenticación del canal

**Alternativas**:

| Opción | Pros | Contras |
|--------|------|---------|
| Anon key sin JWT | Sencillo | Sin identidad, RLS no puede filtrar |
| JWT de Supabase Auth | Estándar | Better Auth no emite esos tokens |
| JWT propio con el secreto del proyecto | Control total | Hay que firmarlo y rotarlo con cuidado |

**Decisión**: JWT propio HS256 de 15 minutos con `sub`, `role=authenticated` y
`aud=authenticated`, firmado con `SUPABASE_JWT_SECRET`.

### 3.4 UUID generado en el cliente

Se mantiene `crypto.randomUUID()` para que la UI pueda ser optimista sin esperar
al servidor. El `id` se valida con `z.string().uuid()` en `tasks-repo.ts`.

### 3.5 Orden y `updated_at`

El orden se calcula en el cliente y se envía como parte del `upsert`. El trigger de
PostgreSQL impone `updated_at` en cada UPDATE; el payload de Realtime actualiza el
estado local con ese valor.

### 3.6 Sondeo de respaldo

**Decisión**: 30 segundos, más un refresco al recuperar el foco y al volver la
conexión. Es más barato que mantener dos mecanismos de tiempo real y cubre los
casos en que el WebSocket falla.

### 3.7 Migraciones

**Problema**: el historial remoto de Supabase tenía versiones sin archivo local y
los archivos locales tenían versiones distintas. Un `supabase db push` desde cero
no reproducía el esquema.

**Decisión**: renombrar los archivos locales a las versiones remotas y añadir los
archivos históricos que faltaban. La fuente de verdad es el conjunto ordenado de
`supabase/migrations/`; no se aplican migraciones nuevas desde el panel sin crear
antes el archivo.

---

## 4. Seguridad

### 4.1 Permisos además de RLS

PostgREST necesita privilegios de tabla además de RLS. En la versión inicial esto
provocó `42501 permission denied`. La arquitectura actual revoca todos los permisos
de `anon` y las escrituras de `authenticated`; solo queda `SELECT` para Realtime.

### 4.2 Carrera al conectar Realtime

Insertar justo en el callback `SUBSCRIBED` puede perder el evento porque la
conexión de replicación aún está arrancando. La app hace una carga inicial por API
y resincroniza al suscribirse; el QA espera unos segundos antes de escribir.

### 4.3 Sesión caducada

`tasks-sync.ts` invoca un manejador de `401` que cierra la sesión y redirige a
`/login`. Así un token revocado no deja la UI mostrando datos que ya no se pueden
escribir.

### 4.4 TLS de Postgres

Supabase usa una CA interna y el pooler devuelve `SELF_SIGNED_CERT_IN_CHAIN` si se
valida la cadena con las CAs del sistema. `db.ts` acepta `SUPABASE_DB_CA_CERT` para
validación completa; sin ella mantiene el cifrado sin validar la cadena para no
romper la conexión.

---

## 5. Resultados de la implementación

| Tema | Resultado |
|------|-----------|
| Dependencia | `@supabase/supabase-js` 2.119.0 (solo Realtime) |
| Esquema | Tabla, trigger, índices, RLS y publicación Realtime |
| API | `GET`, `POST` y `DELETE /api/tasks` autenticados |
| Realtime | INSERT, UPDATE y DELETE recibidos por WebSocket |
| Aislamiento | Policy validada con `request.jwt.claims` simulado |
| Respaldo | Sondeo cada 30 s, foco y reconexión |
| Pruebas | 46 pruebas Vitest |
| Puertas | lint, typegen, tsc, test y build en verde |
| CI | `.github/workflows/ci.yml` |

---

## 6. Próximos pasos

1. ✅ Proyecto Supabase creado (`tfjbkvxxdglxujnrcaeb`).
2. ✅ Migraciones ordenadas y reproducibles.
3. ✅ API autenticada y SQL parametrizado.
4. ✅ Realtime autenticado y RLS.
5. ✅ Sondeo de respaldo y manejo de `401`.
6. ✅ Pruebas unitarias y CI.
7. ✅ QA manual con dos dispositivos.
8. ⏳ Colaboración entre cuentas (tableros compartidos, invitaciones y chat),
   fuera del alcance actual.
