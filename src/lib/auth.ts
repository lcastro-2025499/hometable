import { betterAuth } from "better-auth";
import { emailOTP, username } from "better-auth/plugins";

import { pool } from "./db";
import { passwordResetEmail, sendEmail, verificationCodeEmail } from "./email";

// Resolve base URL: explicit env var, else the public app URL, else Vercel URL, else localhost
const baseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const verificationExpiresIn = 60 * 10; // 10 minutos

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
    // El OTP lo envía explícitamente la ruta de registro para poder revertir
    // la creación de la cuenta si el correo no se puede entregar.
    sendOnSignUp: false,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: verificationExpiresIn,
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
    emailOTP({
      otpLength: 6,
      expiresIn: verificationExpiresIn,
      allowedAttempts: 5,
      // Nunca guardamos el código en claro en la base de datos.
      storeOTP: "hashed",
      // Sustituye el enlace de verificación por defecto por un código OTP.
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "email-verification") return;
        const { subject, html } = verificationCodeEmail("", otp);
        await sendEmail({ to: email, subject, html });
      },
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
