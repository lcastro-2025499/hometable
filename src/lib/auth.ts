import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";

import { pool } from "./db";
import { passwordResetEmail, sendEmail } from "./email";

// Resolve base URL: explicit env var, else the public app URL, else Vercel URL, else localhost
const baseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
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
  // Cookies: secure solo cuando servimos por HTTPS
  cookiePrefix: "better-auth",
  cookiePath: "/",
  cookieAttributes: {
    secure: baseURL.startsWith("https://"),
    sameSite: "lax",
  },
  secret: process.env.BETTER_AUTH_SECRET || "hometable_better_auth_secret_key_32bytes_long!",
  baseURL,
});
