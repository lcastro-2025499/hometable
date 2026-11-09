# Quickstart: Sincronización en tiempo real y multi-dispositivo

**Código**: 300-sync-realtime | **Fecha**: 2026-11-04 | **Estado**: Implementado (2026-11-09)

---

## 1. Prerequisitos

### 1.1 Configuración de Supabase

1. **Crear cuenta en Supabase** (https://supabase.com) si aún no existe.
2. **Usar el proyecto actual** `tfjbkvxxdglxujnrcaeb` o crear uno nuevo:
   - Nombre: `hometable-tasks` (o similar)
   - Región: más cercana a tu ubicación
   - Plan: Free Tier
3. **Obtener credenciales**:
   - `SUPABASE_URL` → Settings → API
   - `SUPABASE_ANON_KEY` → Settings → API (clave publicable o legacy anon)

### 1.2 Variables de entorno

Crear archivo `.env.local` en la raíz del proyecto:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-public-key]
```

### 1.3 Base de datos (ejecutar migración)

La fuente de verdad es
`supabase/migrations/20261109000000_align_tasks_schema.sql`. Es idempotente y
reproducible desde un proyecto vacío: crea la tabla, restricciones, trigger,
índices, RLS, permisos y publicación Realtime.

Opciones para aplicarla:

```bash
# Con Supabase CLI vinculado al proyecto
supabase db push
```

O copiar el contenido del archivo en **SQL Editor → Run**. La migración incluye:

```sql
grant select, insert, update, delete on table public.tasks to anon, authenticated;

alter publication supabase_realtime add table public.tasks;
```

> Sin el `GRANT`, RLS no es suficiente y PostgREST devuelve
> `42501 permission denied for table tasks`.

---

## 2. Instalación

La dependencia `@supabase/supabase-js` ya está en `package.json`.

```bash
# Instalar dependencias del proyecto
pnpm install

# Verificar tipos
pnpm exec next typegen
pnpm exec tsc --noEmit

# Lint y build
pnpm lint
pnpm build

# Desarrollo
pnpm dev
```

---

## 3. Pruebas manuales (QA)

### ✅ Caso 0: Verificación inicial

1. Navegar a `http://localhost:3000`
2. Verificar que el tablero carga y funciona normalmente
3. Crear, editar, borrar una tarea
4. Refrescar página → Verificar que persiste en localStorage

### ✅ Caso 1: Sincronización entre 2 pestañas / dispositivos

**Pre-requisito**: Haber ejecutado el schema de Supabase

1. Abrir `http://localhost:3000` en ventana A
2. Abrir `http://localhost:3000` en ventana B (otra pestaña)
3. En ventana A:
   - Crear una nueva tarea: "Tarea de prueba"
   - Verificar que aparece en ventana B sin refresh
4. En ventana A:
   - Arrastrar la tarea a "En progreso"
   - Verificar que se mueve en ventana B
5. En ventana B:
   - Editar la descripción de la tarea
   - Verificar que se actualiza en ventana A
6. En ventana A:
   - Borrar la tarea
   - Verificar que desaparece en ventana B

### ✅ Caso 2: Conexión offline / online

1. **Desconectar**: 
   - Abrir DevTools → Network → Offline
   - Navegar a `http://localhost:3000`
   - Verificar que el tablero carga y muestra badge "Sin conexión"
2. **Crear tarea offline**:
   - Crear tarea "Offline task"
   - Verificar que aparece y persiste
3. **Reconectar**:
   - DevTools → Network → Online
   - Verificar que el badge cambia a "Sincronizado"
   - Verificar que la tarea "Offline task" se sincronizó a Supabase

### ✅ Caso 3: Migración de datos locales

1. **Preparar datos locales**:
   ```javascript
   // En consola del navegador
   localStorage.setItem('taskboard:v1', JSON.stringify({
     tasks: [{
       id: 'test-migration',
       title: 'Tarea de migración',
       description: 'Test migration',
       status: 'todo',
       priority: 'high',
       dueDate: '2026-12-31',
       tags: ['test'],
       order: 0,
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
     }]
   }));
   ```
2. **Refrescar la página**
3. **Verificar**:
   - `taskboard:v1` se copia a `taskboard:v2` y se conserva como respaldo.
   - Aparece el diálogo de sincronización con la tarea local.
   - Al aceptar, la tarea aparece en Supabase (verificar en dashboard).
   - Si se rechaza, la tarea sigue visible y el aviso se puede reabrir desde el badge.

### ✅ Caso 4: Múltiples dispositivos físicos

1. Tener el proyecto en Vercel (despliegue actual)
2. En dispositivo 1: `https://hometable.vercel.app`
3. En dispositivo 2: mismo URL
4. Crear tarea en dispositivo 1
5. Verificar que aparece en dispositivo 2 en tiempo real
6. Realizar drag-and-drop en dispositivo 2
7. Verificar que se actualiza en dispositivo 1

### ✅ Caso 5: Performance

1. Crear 100 tareas (usar seed)
2. Medir tiempo de carga inicial (debe ser < 2s)
3. Realizar 10 operaciones de drag
4. Verificar que no hay lag en la UI
5. Revalidar con 500 tareas (si es necesario)

---

## 4. Verificación de estado

### 4.1 Estado de conexión visual

| Estado | Badge | Color | Tooltip |
|--------|-------|-------|---------|
| Conectado | "Sincronizado" | Verde | Datos en Supabase |
| Sin conexión | "Sin conexión" | Gris | Cambios en cola local |
| Conectando | "Conectando..." | Ámbar | Estableciendo conexión |
| Error | "Error" | Rojo | Reintento automático |
| Supabase ausente | "Solo local" | Gris | Modo local |

### 4.2 Console logs (desarrollo)

```
[sync] Estado: online
[sync] Conectado a Supabase Realtime
[sync] Recibido evento: INSERT
[sync] Tarea añadida: uuid-xxx
[sync] Sincronización completa
```

---

## 5. Debugging

### 5.1 Verificar suscripción Realtime

- Abre DevTools → Network → WS y busca la conexión a
  `wss://[proyecto].supabase.co/realtime/v1/websocket`.
- En Supabase Dashboard → Realtime Inspector puedes ver los canales activos y los
  eventos.
- En la app, el badge debe pasar de "Conectando..." a "Sincronizado".

### 5.2 Verificar datos en Supabase

En dashboard de Supabase → Table Editor → tasks:
- Verificar que se crean/editan/borran registros
- Verificar timestamps
- Verificar orden correcto

### 5.3 Verificar localStorage fallback

```javascript
// En consola
localStorage.getItem('taskboard:v2')          // estado actual
localStorage.getItem('taskboard:v1')          // respaldo histórico
localStorage.getItem('taskboard:sync-queue')  // operaciones pendientes
```

---

## 6. Límite de pruebas

### 6.1 Límite gratuito Supabase

| Recurso | Límite mensual | Uso estimado |
|---------|----------------|--------------|
| Database size | 500 MB | ~5 MB |
| Rows | 500,000 | ~5,000 tasks |
| Realtime messages | 500,000 | ~10,000 operaciones/mes |

**Conclusión**: El límite es más que suficiente para el MVP.

---

## 7. Checklist de QA

### Verificado automáticamente / por API

- [x] Esquema, trigger, índices, RLS, `GRANT` y publicación Realtime aplicados.
- [x] REST: INSERT `201`, UPDATE `200`, SELECT `200`, DELETE `200`.
- [x] Realtime: INSERT, UPDATE y DELETE recibidos por WebSocket.
- [x] Build de producción exitoso.
- [x] `pnpm lint` y `tsc --noEmit` sin errores.

### Pendiente de validación visual humana

- [ ] Caso 0: Tablero funcional y persistencia tras recargar.
- [ ] Caso 1: Sincronización entre 2 pestañas.
- [ ] Caso 2: Offline → Online con cola de cambios.
- [ ] Caso 3: Diálogo de migración de tareas locales.
- [ ] Caso 4: Sincronización entre 2 dispositivos físicos.
- [ ] Caso 5: Performance con 100+ tareas.
- [ ] Badge de conexión y tooltips correctos.
- [ ] Sin errores en consola del navegador.

Los resultados detallados están en `QA.md`.

---

## 8. Estado de los pasos

1. ✅ Configurar Supabase y variables de entorno (local y Vercel).
2. ✅ Ejecutar migración de base de datos.
3. ✅ Implementar cliente Supabase singleton nullable.
4. ✅ Implementar hook `use-supabase`.
5. ✅ Modificar task-store con métodos remotos.
6. ✅ UI de estado de conexión y diálogo de migración.
7. ✅ Script de migración `taskboard:v1` → `taskboard:v2`.
8. ✅ Validación REST y Realtime contra el proyecto real.
9. ⏳ QA visual manual en navegador (ver `QA.md`).
10. ⏳ Push a `master` y verificación del despliegue en Vercel.