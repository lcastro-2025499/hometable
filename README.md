# Hometable — Tablero de tareas

Aplicación de gestión de tareas en formato **Kanban**, construida con Next.js 16 (App Router), Tailwind CSS 4, componentes de shadcn/ui y Zustand. Los datos se guardan en el `localStorage` del navegador, sin backend.

**Demo pública:** <https://hometable-tasks.vercel.app>

## Características

- Tablero de tres columnas: **Pendiente**, **En progreso** y **Hecha**.
- Arrastrar y soltar entre columnas y reordenar dentro de una columna (ratón, táctil y teclado).
- Crear, editar, duplicar y eliminar tareas, con confirmación y opción de **deshacer**.
- Prioridades (baja, media, alta, urgente), etiquetas, fecha límite y descripción.
- Búsqueda por título, descripción o etiqueta, además de filtros por prioridad, etiqueta y vencimiento.
- Orden manual o automático por prioridad o fecha límite.
- Métricas del tablero: total, pendientes, en progreso, completadas, vencidas y progreso general.
- Modo claro, oscuro o según el sistema.
- Exportación e importación de copias de seguridad en JSON.
- Sincronización entre pestañas del mismo navegador.
- Diseño responsive: carrusel con ajuste por columna en móvil.
- Accesibilidad: anuncios del arrastre en español, etiquetas ARIA y alternativa "Mover a" en el menú de cada tarjeta.

## Stack

| Herramienta | Versión |
| --- | --- |
| Next.js (App Router, Turbopack) | 16.4.3 |
| React | 19.3.0 |
| Tailwind CSS | 4.3.3 |
| shadcn/ui (Radix) | 4.x |
| Zustand + persist | 5.x |
| @dnd-kit | 6.x / 10.x |
| date-fns (locale `es`) | 4.x |
| React Hook Form + Zod | 7.x / 4.x |

## Empezar

Requiere Node.js 20.9 o superior y pnpm.

```bash
pnpm install
pnpm dev
```

La aplicación estará disponible en <http://localhost:3000>.

### Scripts

```bash
pnpm dev      # servidor de desarrollo
pnpm build    # compilación de producción
pnpm start    # servidor de producción (requiere pnpm build)
pnpm lint     # ESLint
pnpm exec tsc --noEmit   # comprobación de tipos
```

## Despliegue

La aplicación está desplegada en **Vercel** (plan Hobby):

- URL de producción: <https://hometable-tasks.vercel.app>
- Repositorio: `lcastro-2025499/hometable` (privado).
- Cada `push` a la rama `master` genera un despliegue automático.
- No requiere variables de entorno ni servicios externos.
- El proyecto usa Node 22 (`.nvmrc`) y pnpm (campo `packageManager`).

Para desplegar desde cero: importar el repositorio en <https://vercel.com/new>, mantener la configuración detectada (Next.js, `pnpm build`) y desplegar. El nombre del proyecto debe ser `hometable-tasks` para conservar el subdominio.

## Estructura

```
src/
  app/
    layout.tsx          # tema, toasts, tooltips y metadatos
    page.tsx            # monta el tablero
    globals.css         # Tailwind 4 y tokens de shadcn
  components/
    board/              # tablero, columnas, tarjetas, toolbar, métricas
    tasks/              # diálogos de tarea, formulario, etiquetas, fecha
    ui/                 # componentes generados por shadcn
    theme-provider.tsx
    theme-toggle.tsx
  hooks/
    use-hydrated.ts     # evita desajustes de hidratación con localStorage
  lib/
    constants.ts        # configuración visual y opciones de filtros
    seed.ts             # datos de ejemplo
    task-utils.ts       # filtros, orden, estadísticas y movimientos
    types.ts
    validation.ts       # esquemas Zod
  store/
    task-store.ts       # estado global con persistencia
```

## Persistencia

- Clave de `localStorage`: `taskboard:v1`.
- Solo se persisten las tareas; filtros y tema se mantienen en memoria o en `next-themes`.
- La carga se hace después de montar el componente, mostrando un esqueleto para evitar desajustes de hidratación.
- Si se abre la aplicación en varias pestañas, los cambios se sincronizan mediante el evento `storage`.
- Para mover los datos a otro navegador, usa **Datos del tablero → Exportar a JSON** y luego **Importar desde JSON**.

### Modelo de tarea

```ts
interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: string; // yyyy-MM-dd
  tags: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
```

## Limitaciones

- Los datos viven en el navegador: no hay cuentas ni sincronización entre dispositivos.
- Limpiar los datos del sitio elimina el tablero; conviene exportar una copia.
