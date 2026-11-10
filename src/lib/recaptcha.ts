const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

/**
 * Verifica un token de reCAPTCHA v2 contra Google. Se ejecuta en el servidor
 * para que un cliente no pueda saltarse la comprobación llamando directamente
 * a la API de registro.
 */
export async function verifyRecaptchaToken(token: string): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret || !token) return false;

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    if (!response.ok) return false;

    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
