import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, username, firstName, lastName } = body as {
      email: string;
      password: string;
      name: string;
      username: string;
      firstName: string;
      lastName: string;
    };

    if (!email || !password || !name || !username || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    // Better Auth server API requires the payload nested under `body`.
    // The `/sign-up/email` schema accepts additional fields (firstName, lastName)
    // via `.and(z.record(z.string(), z.any()))`.
    const result = await auth.api.signUpEmail({
      body: {
        email: email.trim(),
        password,
        name: name.trim(),
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      user: result?.user ?? null,
      token: result?.token ?? null,
    });
  } catch (error: unknown) {
    console.error("Error en registro:", error);

    const message = error instanceof Error ? error.message : "Error interno del servidor";
    const status =
      typeof error === "object" && error !== null && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode) || 500
        : 500;

    const normalized = message.toLowerCase();
    if (
      normalized.includes("already") ||
      normalized.includes("exists") ||
      normalized.includes("taken")
    ) {
      return NextResponse.json(
        { error: "El correo o nombre de usuario ya está registrado" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: message }, { status });
  }
}
