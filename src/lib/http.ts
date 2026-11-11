import { NextResponse } from "next/server";

/**
 * Utilidades HTTP compartidas por las rutas de API: respuestas de error
 * uniformes, lectura de JSON y comprobación de mismo origen.
 */

export function jsonError(
  message: string,
  status: number,
  headers?: HeadersInit,
): NextResponse {
  return NextResponse.json({ error: message }, { status, headers });
}

export async function readJsonBody(
  request: Request,
): Promise<
  { ok: true; data: unknown } | { ok: false; response: NextResponse }
> {
  try {
    return { ok: true, data: await request.json() };
  } catch {
    return {
      ok: false,
      response: jsonError("Cuerpo de la petición inválido.", 400),
    };
  }
}

/**
 * Exige que las escrituras vengan del origen canónico. Además del `SameSite`
 * de la cookie, esto bloquea CSRF: un formulario de otro sitio no puede enviar
 * el `Origin` correcto.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  let candidate: URL;
  try {
    candidate = new URL(origin);
  } catch {
    return false;
  }

  let requestOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    return false;
  }

  if (candidate.origin === requestOrigin) return true;

  const configured = process.env.BETTER_AUTH_URL;
  if (!configured) return false;

  try {
    return candidate.origin === new URL(configured).origin;
  } catch {
    return false;
  }
}

export function requireSameOrigin(request: Request): NextResponse | null {
  return isSameOrigin(request) ? null : jsonError("Origen no permitido.", 403);
}

const SAFE_IP = /^[0-9a-fA-F:.]{3,45}$/;

/** IP del cliente según el proxy de Vercel. Nunca se usa para autorizar. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const candidate = forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip")?.trim();

  return candidate && SAFE_IP.test(candidate) ? candidate : "unknown";
}

export function isHttpsRequest(request: Request): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) return forwardedProto.split(",")[0]?.trim() === "https";

  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}
