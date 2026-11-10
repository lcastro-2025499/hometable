import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { registerPayloadSchema } from "@/lib/auth-validation";
import { pool } from "@/lib/db";
import { sendEmail, verificationCodeEmail } from "@/lib/email";
import { verifyRecaptchaToken } from "@/lib/recaptcha";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Error interno del servidor";
}

function statusFrom(error: unknown): number {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    return Number((error as { statusCode?: number }).statusCode) || 500;
  }
  return 500;
}

async function emailAlreadyExists(email: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `select 1 from public."user" where lower(email) = lower($1) limit 1`,
    [email],
  );
  return Boolean(rowCount);
}

async function usernameAlreadyExists(username: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `select 1 from public."user" where lower(username) = lower($1) limit 1`,
    [username],
  );
  return Boolean(rowCount);
}

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

  const { email, password, name, username, firstName, lastName, recaptchaToken } = parsed.data;

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
    if (await emailAlreadyExists(email)) {
      return NextResponse.json(
        { error: "El correo ya está registrado." },
        { status: 409 },
      );
    }

    if (await usernameAlreadyExists(username)) {
      return NextResponse.json(
        { error: "El nombre de usuario ya está en uso." },
        { status: 409 },
      );
    }

    // El plugin `emailOTP` no envía nada en el registro (sendOnSignUp: false):
    // generamos el código aquí para poder eliminar la cuenta si Resend falla.
    await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
        username,
        firstName,
        lastName,
      },
    });

    try {
      const otp = await auth.api.createVerificationOTP({
        body: { email, type: "email-verification" },
      });

      const { subject, html } = verificationCodeEmail(firstName, otp);
      await sendEmail({ to: email, subject, html });
    } catch (deliveryError) {
      console.error("No se pudo enviar el código de verificación:", deliveryError);
      // Revertimos la creación: una cuenta sin correo verificable no debe
      // quedar registrada (además evita bloquear el email para reintentos).
      await pool.query(`delete from public."user" where lower(email) = lower($1)`, [email]);

      return NextResponse.json(
        {
          error:
            "No pudimos enviar el correo de verificación. Revisa la configuración de Resend e inténtalo de nuevo.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, requiresEmailVerification: true });
  } catch (error: unknown) {
    console.error("Error en registro:", error);

    const message = errorMessage(error);
    const normalized = message.toLowerCase();

    if (
      normalized.includes("already") ||
      normalized.includes("exists") ||
      normalized.includes("taken") ||
      normalized.includes("unique")
    ) {
      return NextResponse.json(
        { error: "El correo o nombre de usuario ya está registrado." },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: message }, { status: statusFrom(error) });
  }
}
