import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth-server";
import { signRealtimeToken } from "@/lib/realtime-token";

/**
 * Emite un JWT corto para que el navegador pueda abrir un canal de Supabase
 * Realtime con RLS. Nunca devuelve secretos ni datos de la sesión.
 */
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  if (!session.user.emailVerified) {
    return NextResponse.json(
      { error: "Debes verificar tu correo electrónico." },
      { status: 403 },
    );
  }

  try {
    const { token, expiresAt } = signRealtimeToken(session.user.id);
    return NextResponse.json(
      { token, expiresAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("No se pudo firmar el token de Realtime:", error);
    return NextResponse.json(
      { error: "Realtime no está configurado en el servidor." },
      { status: 503 },
    );
  }
}
