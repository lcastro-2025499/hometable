import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth-server";
import { deleteTasksByIds, listTasks, replaceTasks, upsertTasks } from "@/lib/tasks-repo";

function unauthorized(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Comprobación de mismo origen para peticiones de escritura. El navegador
 * siempre envía `Origin` en POST/PUT/DELETE, así que si viene de otro sitio se
 * rechaza (defensa CSRF adicional al `SameSite=Lax` de la cookie de sesión).
 */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const host = request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function requireUser() {
  const session = await getSession();

  if (!session) return { response: unauthorized("No autenticado.", 401) } as const;
  if (!session.user.emailVerified) {
    return { response: unauthorized("Debes verificar tu correo electrónico.", 403) } as const;
  }

  return { userId: session.user.id } as const;
}

async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    const tasks = await listTasks(auth.userId);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Error listando tareas:", error);
    return unauthorized("No se pudieron cargar las tareas.", 500);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return unauthorized("Origen no permitido.", 403);

  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = (await readJson(request)) as { tasks?: unknown } | null;
  if (!body || !("tasks" in body)) return unauthorized("Cuerpo inválido.", 400);

  try {
    const result = await upsertTasks(auth.userId, body.tasks);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error guardando tareas:", error);
    return unauthorized("No se pudieron guardar las tareas.", 500);
  }
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return unauthorized("Origen no permitido.", 403);

  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = (await readJson(request)) as { tasks?: unknown } | null;
  if (!body || !("tasks" in body)) return unauthorized("Cuerpo inválido.", 400);

  try {
    const result = await replaceTasks(auth.userId, body.tasks);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error reemplazando tareas:", error);
    return unauthorized("No se pudo reemplazar el tablero.", 500);
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return unauthorized("Origen no permitido.", 403);

  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = (await readJson(request)) as { ids?: unknown } | null;
  if (!body || !("ids" in body)) return unauthorized("Cuerpo inválido.", 400);

  try {
    const result = await deleteTasksByIds(auth.userId, body.ids);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error borrando tareas:", error);
    return unauthorized("No se pudieron borrar las tareas.", 500);
  }
}
