import { NextResponse } from "next/server";

import { registerPayloadSchema } from "@/lib/auth-validation";
import { registerPending } from "@/lib/pending-registration";
import { verifyRecaptchaToken } from "@/lib/recaptcha";

/**
 * Registro en dos pasos: aquí solo se guarda un registro pendiente y se envía
 * el código. La cuenta de Better Auth se crea en /api/auth/verify-email cuando
 * el usuario confirma el OTP.
 */
export async function POST(request: Request) {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido." }, { status: 400 });
  }

  const parsed = registerPayloadSchema.safeParse(raw);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "Datos de registro inválidos." },
      { status: 400 },
    );
  }

  const { email, password, username, firstName, lastName, recaptchaToken } = parsed.data;
  const name = `${firstName} ${lastName}`.trim();

  // La verificación se hace aquí (no en una ruta aparte) para que no se pueda
  // saltar llamando directamente a la API de registro.
  const recaptchaOk = await verifyRecaptchaToken(recaptchaToken);
  if (!recaptchaOk) {
    return NextResponse.json(
      { error: "No pudimos verificar el reCAPTCHA. Inténtalo de nuevo." },
      { status: 400 },
    );
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
      case "sent":
        return NextResponse.json({ success: true, requiresEmailVerification: true });
      case "email_taken":
        return NextResponse.json({ error: "El correo ya está registrado." }, { status: 409 });
      case "username_taken":
        return NextResponse.json(
          { error: "El nombre de usuario ya está en uso." },
          { status: 409 },
        );
      case "delivery_failed":
        console.error("No se pudo enviar el código de verificación:", result.error);
        return NextResponse.json(
          {
            error:
              "No pudimos enviar el correo de verificación. Revisa la configuración de Resend e inténtalo de nuevo.",
          },
          { status: 502 },
        );
    }
  } catch (error: unknown) {
    console.error("Error en registro:", error);
    return NextResponse.json(
      { error: "No pudimos completar el registro. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
