import { NextResponse } from "next/server";

import { verifyEmailSchema } from "@/lib/auth-validation";
import { clientIp, jsonError, readJsonBody, requireSameOrigin } from "@/lib/http";
import { clearPendingCookie, readPendingId } from "@/lib/pending-cookie";
import { verifyPendingRegistration } from "@/lib/pending-registration";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Confirma el OTP de un registro pendiente y crea la cuenta real. No inicia
 * sesión: el usuario debe entrar con su contraseña después.
 *
 * El código solo es válido en el navegador que lo solicitó: el id del registro
 * pendiente viaja en una cookie httpOnly firmada.
 */
export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const body = await readJsonBody(request, 16 * 1024);
  if (!body.ok) return body.response;

  const parsed = verifyEmailSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);
  }

  try {
    const limit = await checkRateLimit(
      "verify",
      clientIp(request),
      parsed.data.email,
    );
    if (!limit.allowed) {
      return jsonError(
        "Demasiados intentos. Espera unos minutos antes de volver a intentarlo.",
        429,
        { "Retry-After": String(limit.retryAfterSeconds) },
      );
    }
  } catch (error) {
    console.error("Rate limit no disponible:", error);
    return jsonError("La verificación no está disponible en este momento.", 503);
  }

  const pendingId = readPendingId(request);
  if (!pendingId) {
    return jsonError(
      "No encontramos una verificación activa. Vuelve a completar el registro.",
      400,
    );
  }

  try {
    const result = await verifyPendingRegistration(
      parsed.data.email,
      parsed.data.otp,
      pendingId,
    );

    switch (result.status) {
      case "verified": {
        const response = NextResponse.json({ success: true });
        clearPendingCookie(response, request);
        return response;
      }
      case "not_found":
        return jsonError("Código incorrecto o expirado.", 400);
      case "expired":
        return jsonError("El código expiró. Solicita uno nuevo.", 410);
      case "invalid":
        return jsonError(
          result.attemptsLeft === 0
            ? "Código incorrecto. Solicita un código nuevo."
            : `Código incorrecto. Te quedan ${result.attemptsLeft} intentos.`,
          400,
        );
      case "too_many_attempts":
        return jsonError("Demasiados intentos. Solicita un código nuevo.", 429);
      case "email_taken":
      case "username_taken":
        return jsonError(
          "No pudimos crear la cuenta con esos datos. Regístrate con otro correo o nombre de usuario.",
          409,
        );
    }
  } catch (error: unknown) {
    console.error("Error al verificar el correo:", error);
    return jsonError("No pudimos verificar el correo. Inténtalo de nuevo.", 500);
  }
}
