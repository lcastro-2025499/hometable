import { NextResponse } from "next/server";

import { resendVerificationSchema } from "@/lib/auth-validation";
import { resendPendingCode } from "@/lib/pending-registration";

/**
 * Reenvía el código de un registro pendiente respetando un cooldown de 60 s.
 */
export async function POST(request: Request) {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido." }, { status: 400 });
  }

  const parsed = resendVerificationSchema.safeParse(raw);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "Correo electrónico no válido." },
      { status: 400 },
    );
  }

  try {
    const result = await resendPendingCode(parsed.data.email);

    switch (result.status) {
      case "sent":
        return NextResponse.json({ success: true });
      case "not_found":
        return NextResponse.json(
          {
            error:
              "No encontramos un registro pendiente con ese correo. Vuelve a completar el formulario.",
          },
          { status: 404 },
        );
      case "cooldown":
        return NextResponse.json(
          {
            error: `Espera ${result.retryAfterSeconds} segundos antes de pedir otro código.`,
            retryAfterSeconds: result.retryAfterSeconds,
          },
          { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
        );
      case "delivery_failed":
        console.error("No se pudo reenviar el código de verificación:", result.error);
        return NextResponse.json(
          { error: "No pudimos enviar el correo. Inténtalo de nuevo en unos minutos." },
          { status: 502 },
        );
    }
  } catch (error: unknown) {
    console.error("Error al reenviar el código:", error);
    return NextResponse.json(
      { error: "No pudimos reenviar el código. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
