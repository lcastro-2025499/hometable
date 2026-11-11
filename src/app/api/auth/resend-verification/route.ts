import { NextResponse } from "next/server";

import { resendVerificationSchema } from "@/lib/auth-validation";
import { clientIp, jsonError, readJsonBody, requireSameOrigin } from "@/lib/http";
import { readPendingId, setPendingCookie } from "@/lib/pending-cookie";
import { resendPendingCode } from "@/lib/pending-registration";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Reenvía el código de un registro pendiente.
 *
 * La respuesta es genérica exista o no el registro, para no permitir enumerar
 * correos. El cooldown de 60 s se sigue aplicando y el código solo se envía al
 * navegador que inició el registro (cookie firmada).
 */
export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = resendVerificationSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Correo no válido.", 400);
  }

  try {
    const limit = await checkRateLimit(
      "resend",
      clientIp(request),
      parsed.data.email,
    );
    if (!limit.allowed) {
      return jsonError(
        "Demasiadas solicitudes. Espera unos minutos antes de volver a intentarlo.",
        429,
        { "Retry-After": String(limit.retryAfterSeconds) },
      );
    }
  } catch (error) {
    console.error("Rate limit no disponible:", error);
    return jsonError("El reenvío no está disponible en este momento.", 503);
  }

  const pendingId = readPendingId(request);
  if (!pendingId) {
    return NextResponse.json({ success: true });
  }

  try {
    const result = await resendPendingCode(parsed.data.email, pendingId);

    switch (result.status) {
      case "sent": {
        const response = NextResponse.json({ success: true });
        setPendingCookie(response, request, pendingId);
        return response;
      }
      case "not_found":
        return NextResponse.json({ success: true });
      case "cooldown":
        return jsonError(
          `Espera ${result.retryAfterSeconds} segundos antes de pedir otro código.`,
          429,
          { "Retry-After": String(result.retryAfterSeconds) },
        );
      case "delivery_failed":
        console.error("No se pudo reenviar el código de verificación:", result.error);
        return jsonError(
          "No pudimos enviar el correo. Inténtalo de nuevo en unos minutos.",
          502,
        );
    }
  } catch (error: unknown) {
    console.error("Error al reenviar el código:", error);
    return jsonError("No pudimos reenviar el código. Inténtalo de nuevo.", 500);
  }
}
