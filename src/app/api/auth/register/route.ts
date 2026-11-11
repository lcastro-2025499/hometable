import { NextResponse } from "next/server";

import { registerPayloadSchema } from "@/lib/auth-validation";
import { clientIp, readJsonBody, requireSameOrigin, jsonError } from "@/lib/http";
import { setPendingCookie } from "@/lib/pending-cookie";
import { registerPending } from "@/lib/pending-registration";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyRecaptchaToken } from "@/lib/recaptcha";

/**
 * Registro en dos pasos: aquí solo se guarda un registro pendiente y se envía
 * el código. La cuenta de Better Auth se crea en /api/auth/verify-email cuando
 * el usuario confirma el OTP.
 */
export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const body = await readJsonBody(request, 16 * 1024);
  if (!body.ok) return body.response;

  const parsed = registerPayloadSchema.safeParse(body.data);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Datos inválidos.", 400);
  }

  try {
    const limit = await checkRateLimit("register", clientIp(request));
    if (!limit.allowed) {
      return jsonError(
        "Demasiados intentos. Espera unos minutos antes de volver a intentarlo.",
        429,
        { "Retry-After": String(limit.retryAfterSeconds) },
      );
    }
  } catch (error) {
    console.error("Rate limit no disponible:", error);
    return jsonError("El registro no está disponible en este momento.", 503);
  }

  const { email, password, username, firstName, lastName, recaptchaToken } = parsed.data;
  const name = `${firstName} ${lastName}`.trim();

  // La verificación se hace aquí (no en una ruta aparte) para que no se pueda
  // saltar llamando directamente a la API de registro.
  const recaptchaOk = await verifyRecaptchaToken(recaptchaToken);
  if (!recaptchaOk) {
    return jsonError("No pudimos verificar el reCAPTCHA. Inténtalo de nuevo.", 400);
  }

  try {
    const result = await registerPending({
      email,
      password,
      username,
      displayUsername: username,
      name,
      firstName,
      lastName,
    });

    switch (result.status) {
      case "sent": {
        const response = NextResponse.json({
          success: true,
          requiresEmailVerification: true,
        });
        setPendingCookie(response, request, result.pendingId);
        return response;
      }
      case "email_taken":
      case "username_taken":
        return jsonError(
          "No pudimos completar el registro con esos datos. Prueba con otro correo o nombre de usuario.",
          409,
        );
      case "delivery_failed":
        console.error("No se pudo enviar el código de verificación:", result.error);
        return jsonError(
          "No pudimos enviar el correo de verificación. Inténtalo de nuevo más tarde.",
          502,
        );
    }
  } catch (error: unknown) {
    console.error("Error en registro:", error);
    return jsonError("No pudimos completar el registro. Inténtalo de nuevo.", 500);
  }
}
