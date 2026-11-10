import { NextResponse } from "next/server";

import { verifyEmailSchema } from "@/lib/auth-validation";
import { verifyPendingRegistration } from "@/lib/pending-registration";

/**
 * Confirma el OTP de un registro pendiente y crea la cuenta real. No inicia
 * sesión: el usuario debe entrar con su contraseña después.
 */
export async function POST(request: Request) {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido." }, { status: 400 });
  }

  const parsed = verifyEmailSchema.safeParse(raw);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "Datos de verificación inválidos." },
      { status: 400 },
    );
  }

  try {
    const result = await verifyPendingRegistration(parsed.data.email, parsed.data.otp);

    switch (result.status) {
      case "verified":
        return NextResponse.json({ success: true });
      case "not_found":
        return NextResponse.json(
          {
            error:
              "No encontramos un registro pendiente con ese correo. Vuelve a completar el formulario de registro.",
          },
          { status: 404 },
        );
      case "expired":
        return NextResponse.json(
          { error: "El código expiró. Solicita uno nuevo." },
          { status: 410 },
        );
      case "invalid":
        return NextResponse.json(
          {
            error:
              result.attemptsLeft === 0
                ? "Código incorrecto. Solicita un código nuevo."
                : `Código incorrecto. Te quedan ${result.attemptsLeft} intentos.`,
            attemptsLeft: result.attemptsLeft,
          },
          { status: 400 },
        );
      case "too_many_attempts":
        return NextResponse.json(
          { error: "Demasiados intentos. Solicita un código nuevo." },
          { status: 429 },
        );
      case "email_taken":
        return NextResponse.json(
          { error: "El correo ya está registrado. Inicia sesión." },
          { status: 409 },
        );
      case "username_taken":
        return NextResponse.json(
          { error: "El nombre de usuario ya está en uso. Regístrate con otro." },
          { status: 409 },
        );
    }
  } catch (error: unknown) {
    console.error("Error al verificar el correo:", error);
    return NextResponse.json(
      { error: "No pudimos verificar el correo. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
