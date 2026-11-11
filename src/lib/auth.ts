import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";

import { pool } from "./db";
import { passwordResetEmail, sendEmail } from "./email";
import { requireEnv, requireSecret } from "./env";
import { consumeRateLimit } from "./rate-limit";

/**
 * URL canónica de la aplicación. Es la única fuente para cookies, enlaces de
 * correo y orígenes de confianza: no se aceptan previews ni localhost como
 * respaldo silencioso.
 */
function resolveBaseUrl(): string {
  const configured = requireEnv("BETTER_AUTH_URL").trim().replace(/\/+$/, "");
  const url = new URL(configured);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("BETTER_AUTH_URL debe usar http o https.");
  }

  // `http://localhost` solo se usa para desarrollo local y builds sin red.
  // Cualquier otro host en producción debe ser HTTPS.
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (
    process.env.NODE_ENV === "production" &&
    url.protocol !== "https:" &&
    !isLocalHost
  ) {
    throw new Error("BETTER_AUTH_URL debe usar HTTPS en producción.");
  }

  return url.origin;
}

const baseURL = resolveBaseUrl();

/**
 * Orígenes adicionales aceptados por Better Auth. Sirve para convivir con el
 * dominio de Vercel mientras el canónico es el dominio propio: las cookies
 * siguen emitiéndose contra `baseURL`, pero el login funciona desde cada host
 * listado aquí.
 */
function resolveTrustedOrigins(canonical: string): string[] {
  const raw = process.env.BETTER_AUTH_TRUSTED_ORIGINS?.trim();
  if (!raw) return [canonical];

  const extras: string[] = [];

  for (const candidate of raw.split(",")) {
    const value = candidate.trim();
    if (!value) continue;

    // `new URL` valida el formato; `.origin` normaliza y descarta rutas.
    const url = new URL(value);
    const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);

    if (
      process.env.NODE_ENV === "production" &&
      url.protocol !== "https:" &&
      !isLocalHost
    ) {
      throw new Error("BETTER_AUTH_TRUSTED_ORIGINS debe usar HTTPS en producción.");
    }

    extras.push(url.origin);
  }

  return [...new Set([canonical, ...extras])];
}

export const auth = betterAuth({
  database: pool,
  baseURL,
  secret: requireSecret("BETTER_AUTH_SECRET", 32),
  trustedOrigins: resolveTrustedOrigins(baseURL),
  emailAndPassword: {
    enabled: true,
    // El único camino de alta es /api/auth/register: valida reCAPTCHA y crea
    // la cuenta solo tras verificar el OTP. Sin esta opción, Better Auth
    // expondría POST /api/auth/sign-up/email y saltaría ese flujo.
    disableSignUp: true,
    // Ninguna cuenta puede iniciar sesión hasta confirmar su correo.
    requireEmailVerification: true,
    autoSignIn: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    async sendResetPassword({ user, url, token }) {
      // Si el envío falla, el error se propaga para no dar una falsa sensación
      // de éxito al usuario.
      const { subject, html } = passwordResetEmail(user.name, token, url);
      await sendEmail({ to: user.email, subject, html });
    },
  },
  emailVerification: {
    // La verificación la gestiona /api/auth/verify-email: no hay usuario al
    // que enviar correos hasta que el OTP es correcto. Better Auth solo
    // comprueba `emailVerified` al iniciar sesión.
    sendOnSignUp: false,
    sendOnSignIn: false,
    autoSignInAfterVerification: false,
  },
  user: {
    additionalFields: {
      firstName: { type: "string", required: true },
      lastName: { type: "string", required: true },
    },
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 15,
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24, // 1 día
  },
  cookiePrefix: "better-auth",
  cookiePath: "/",
  cookieAttributes: {
    // `baseURL` es canónica y en producción se exige HTTPS arriba.
    secure: baseURL.startsWith("https://"),
    sameSite: "lax",
  },
  advanced: {
    // Vercel escribe `x-real-ip` y no deja que el cliente lo falsifique.
    ipAddress: {
      ipAddressHeaders: ["x-real-ip", "x-forwarded-for"],
    },
    database: {
      // Durante `next build` no hay base de datos disponible: validar el
      // esquema solo generaría errores ruidosos en CI. En ejecución sigue
      // activo para detectar migraciones pendientes cuanto antes.
      validateSchema: process.env.NEXT_PHASE !== "phase-production-build",
    },
  },
  rateLimit: {
    // El almacenamiento por defecto es memoria del proceso: en serverless cada
    // instancia tendría su propio contador. `auth_rate_limit` ya existe y su
    // `insert ... on conflict` es atómico, así que se comparte entre instancias.
    enabled: process.env.NODE_ENV === "production",
    customStorage: { consume: consumeRateLimit },
  },
});
