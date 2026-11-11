import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth-server";
import { jsonError, readJsonBody, requireSameOrigin } from "@/lib/http";
import { deleteTasksByIds, listTasks, upsertTasks } from "@/lib/tasks-repo";

async function requireUser() {
  const session = await getSession();

  if (!session) return { response: jsonError("No autenticado.", 401) } as const;
  if (!session.user.emailVerified) {
    return {
      response: jsonError("Debes verificar tu correo electrónico.", 403),
    } as const;
  }

  return { userId: session.user.id } as const;
}

function readField(body: unknown, field: "tasks" | "ids"): unknown {
  if (!body || typeof body !== "object" || !(field in body)) return undefined;
  return (body as Record<string, unknown>)[field];
}

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    const tasks = await listTasks(auth.userId);
    return NextResponse.json(
      { tasks },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error listando tareas:", error);
    return jsonError("No se pudieron cargar las tareas.", 500);
  }
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const tasks = readField(body.data, "tasks");
  if (tasks === undefined) return jsonError("Cuerpo inválido.", 400);

  try {
    const result = await upsertTasks(auth.userId, tasks);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error guardando tareas:", error);
    return jsonError("No se pudieron guardar las tareas.", 500);
  }
}

export async function DELETE(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const ids = readField(body.data, "ids");
  if (ids === undefined) return jsonError("Cuerpo inválido.", 400);

  try {
    const result = await deleteTasksByIds(auth.userId, ids);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error borrando tareas:", error);
    return jsonError("No se pudieron borrar las tareas.", 500);
  }
}
