import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ success: false, message: "Token de reCAPTCHA faltante." }, { status: 400 });
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ success: true });
    }

    const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
    });

    const data = await verifyRes.json();
    if (data.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, message: "Verificación de reCAPTCHA fallida.", errors: data["error-codes"] }, { status: 400 });
    }
  } catch (err) {
    console.error("reCAPTCHA verify error:", err);
    return NextResponse.json({ success: false, message: "Error interno al verificar reCAPTCHA." }, { status: 500 });
  }
}
