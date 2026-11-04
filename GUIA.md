# Guía de Configuración: Sincronización en Tiempo Real con Supabase

Esta guía explica los pasos necesarios para configurar Supabase antes de la implementación del flujo de sincronización multi-dispositivo.

---

## 📋 RESUMEN DE PASOS

1. Crear proyecto en Supabase
2. Obtener credenciales
3. Crear archivo `.env.local`
4. Configurar base de datos con el schema
5. (Opcional) Verificar deploy en Vercel

---

## PASO 1: Crear proyecto en Supabase

1. **Ir a**: https://supabase.com
2. **Crear cuenta** (si no tienes)
3. **Click en**: "New project"
4. **Configurar**:
   - **Project name**: `hometable-sync` (o el nombre que prefieras)
   - **Password**: crea una contraseña segura
   - **Region**: selecciona la más cercana a tu ubicación
5. **Esperar** a que se inicialice (~2 minutos)

---

## PASO 2: Obtener credenciales

Una vez creado el proyecto:

1. Ve a **Settings → API**
2. Copia estos valores:

```
NEXT_PUBLIC_SUPABASE_URL = https://[tu-proyecto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = [clave pública]
```

> ⚠️ **IMPORTANTE**: La clave `anon-key` es pública, no la consideres sensible.

---

## PASO 3: Crear archivo .env.local

En la raíz del proyecto:

```bash
cd C:\Users\luisc\Desktop\code\hometable
```

Crea el archivo `.env.local`:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU-ANON-KEY
```

**Ejemplo real**:
```
NEXT_PUBLIC_SUPABASE_URL=https://hometable-sync.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## PASO 4: Configurar base de datos

### 4.1 Crear tabla vía Table Editor

1. En Supabase, ve a **Table Editor**
2. Haz clic en **New Table**
3. Nombre de tabla: `tasks`
4. Configura cada campo así:

| # | Campo | Type (desplegable) | Default value | Comentario |
|---|-------|-------------------|---------------|------------|
| 1 | id | `uuid` | `gen_random_uuid()` | ✅ Primary Key activado |
| 2 | title | `text` | `EMPTY` | ✅ |
| 3 | description | `text` | `EMPTY` | ✅ |
| 4 | status | `text` | `todo` | ✅ |
| 5 | priority | `text` | `low` | ⚠️ CAMBIAR de "Choose a column" a `text` |
| 6 | due_date | `date` | `NULL` | ⚠️ CAMBIAR de "Choose a column" a `date` |
| 7 | tags | `text[]` | `NULL` | ⚠️ CAMBIAR de "Choose a column" a `text[]` (array) |
| 8 | order | `integer` | `0` | ⚠️ CAMBIAR de "Choose a column" a `integer` |
| 9 | created_at | `timestamptz` | `now()` | ⚠️ CAMBIAR de "Choose a column" a `timestamptz` |
| 10 | updated_at | `timestamptz` | `now()` | ⚠️ CAMBIAR de "Choose a column" a `timestamptz` |
| 11 | completed_at | `timestamptz` | `NULL` | ⚠️ CAMBIAR de "Choose a column" a `timestamptz` |

**Instrucciones por campo:**

- **priority**: Haz clic en el desplegable "Choose a column" → elige `text`. En Default, elige `low`.
- **due_date**: Haz clic en el desplegable → elige `date`. Deja Default como `NULL`.
- **tags**: Haz clic en el desplegable → busca `text[]` o `array`. Deja Default como `NULL`.
- **order**: Haz clic en el desplegable → elige `integer`. En Default, escribe `0`.
- **created_at**: Haz clic en el desplegable → elige `timestamptz`. En Default, elige `now()` o escribe `now()`.
- **updated_at**: Haz clic en el desplegable → elige `timestamptz`. En Default, elige `now()` o escribe `now()`.
- **completed_at**: Haz clic en el desplegable → elige `timestamptz`. Deja Default como `NULL`.

5. Marca el checkbox **Primary Key** en la fila de `id`
6. Haz clic en **Save** (abajo de la pantalla)

### 4.2 Ejecutar SQL de configuración

Ve a **SQL Editor** en Supabase (menú lateral) y pega este código:

```sql
-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_order ON tasks ("order");
CREATE INDEX IF NOT EXISTS idx_tasks_status_order ON tasks (status, "order");

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at 
  BEFORE UPDATE ON tasks 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_updated_at_column();

-- Políticas RLS para MVP (públicas)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public select" ON tasks;
CREATE POLICY "public select" ON tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "public insert" ON tasks;
CREATE POLICY "public insert" ON tasks FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "public update" ON tasks;
CREATE POLICY "public update" ON tasks FOR UPDATE USING (true);

DROP POLICY IF EXISTS "public delete" ON tasks;
CREATE POLICY "public delete" ON tasks FOR DELETE USING (true);
```

Haz clic en **Run**.

---

## PASO 5: (Opcional) Verificar despliegue en Vercel

1. **Ir a**: https://vercel.com
2. **New Project** → Importa tu repositorio
3. **Configure build**:
   - Framework: Next.js
   - Build Command: `pnpm build`
   - Output Directory: `.next`
4. **Deploy**

> El proyecto debe desplegarse sin variables de entorno adicionales.

---

## PASO 6: Verificar conexión (después de implementar)

Una vez implementados los cambios:

1. Ejecuta localmente: `pnpm dev`
2. Abre `http://localhost:3000`
3. Busca en consola: `✓ Connected to Supabase` o similar
4. Verifica badge de conexión en la UI

---

## 📝 NOTAS IMPORTANTES

### Variables de entorno

- **Siempre** usa `.env.local` para desarrollo (¡NO lo commitees!)
- Para producción en Vercel, agrega las mismas variables en **Settings → Environment Variables**

### Clave de versión

- El localStorage usará `taskboard:v2` (actualizado desde v1)
- Los datos locales existentes pueden migrarse

### Costos

- **Plan gratuito**: 500MB BD, 500k mensajes Realtime/mes
- **Sin costo adicional** para el MVP

---

## ✅ CHECKLIST PARA TI

Antes de notificarme que tienes todo listo:

- [ ] Cuenta en Supabase creada
- [ ] Project `hometable-sync` creado
- [ ] Variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` obtenidas
- [ ] Archivo `.env.local` creado con las credenciales
- [ ] Tabla `tasks` creada con el schema
- [ ] SQL de triggers e índices ejecutado
- [ ] Políticas RLS configuradas
- [ ] `.env.local` está en `.gitignore` (verificado)

---

## 🔧 COMANDOS ÚTILES

```bash
# Ver variables de entorno cargadas
pnpm dev

# Verificar que .env.local existe
ls -la .env.local

# Limpiar localStorage (para pruebas)
# Abre consola en browser: localStorage.clear()

# Ver logs de Supabase (desarrollo)
# Busca en consola del navegador: supabase
```

---

## 🎯 CUANDO TERMINES

Notifica a este agente cuando hayas completado todos los pasos y así continuaré con:

1. Instalar dependencias
2. Crear los hooks de Supabase
3. Modificar el store con sincronización
4. Crear UI de estado de conexión
5. Implementar y probar

---

**¡Listo!** Sigue los pasos en orden y avísame cuando tengas todo configurado.