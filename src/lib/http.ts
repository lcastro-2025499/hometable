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
  maxBytes = 1_048_576,
): Promise<
  { ok: true; data: unknown } | { ok: false; response: NextResponse }
> {
  const declared = Number(request.headers.get("content-length"));

  if (Number.isFinite(declared) && declared > maxBytes) {
    return {
      ok: false,
      response: jsonError("Cuerpo de la petición demasiado grande.", 413),
    };
  }

  if (!request.body) {
    return {
      ok: false,
      response: jsonError("Cuerpo de la petición inválido.", 400),
    };
  }

  // Se lee por streaming para no confiar solo en Content-Length: una petición
  // con `Transfer-Encoding: chunked` podría declarar un tamaño pequeño y enviar
  // un cuerpo enorme.
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return {
          ok: false,
          response: jsonError("Cuerpo de la petición demasiado grande.", 413),
        };
      }

      chunks.push(value);
    }
  } catch {
    return {
      ok: false,
      response: jsonError("Cuerpo de la petición inválido.", 400),
    };
  }

  const text = new TextDecoder().decode(
    chunks.length === 1 ? chunks[0] : concatChunks(chunks, total),
  );

  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return {
      ok: false,
      response: jsonError("Cuerpo de la petición inválido.", 400),
    };
  }
}

function concatChunks(chunks: Uint8Array[], total: number): Uint8Array {
  const merged = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return merged;
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
  // Vercel escribe `x-real-ip` y sobrescribe `x-forwarded-for`; se prefiere el
  // primero para que un cliente no pueda falsificar la clave del rate limit.
  // En otros despliegues ambos valores son solo una pista, nunca una identidad.
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip")?.trim();
  const candidate = realIp
    ? realIp
    : forwarded?.split(",")[0]?.trim();

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
