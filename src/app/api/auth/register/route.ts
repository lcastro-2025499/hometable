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

    // Sign up with Better Auth API including additional fields (firstName, lastName, username)
    // The API schema uses .and(z.record(z.string(), z.any())) to accept additional fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (auth.api.signUpEmail as any)({
      email: email.trim(),
      password: password,
      name: name.trim(),
      username: username.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });

    if (!result) {
      return NextResponse.json(
        { error: "No se pudo crear el usuario" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      token: result.token,
    });
  } catch (error: unknown) {
    console.error("Error en registro:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    if (message.includes("already exists")) {
      return NextResponse.json(
        { error: "El correo o nombre de usuario ya está registrado" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}