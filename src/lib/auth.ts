import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { Pool } from "pg";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

// Resolve base URL: explicit env var, else the public app URL, else Vercel URL, else localhost
const baseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" || process.env.DATABASE_URL?.includes("supabase.co") || process.env.DATABASE_URL?.includes("pooler.supabase.com") || process.env.DIRECT_URL?.includes("pooler.supabase.com")
      ? { rejectUnauthorized: false }
      : false,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    async sendResetPassword({ user, url, token }) {
      const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
      try {
        await resend.emails.send({
          from: fromEmail,
          to: user.email,
          subject: "Código para restablecer tu contraseña - Hometable",
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
              <h2 style="color: #18181b;">Restablecer contraseña</h2>
              <p>Hola <strong>${user.name}</strong>,</p>
              <p>Has solicitado restablecer tu contraseña en Hometable. Tu código de verificación es:</p>
              <div style="background-color: #f4f4f5; padding: 12px 24px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; border-radius: 6px; margin: 16px 0;">
                ${token}
              </div>
              <p>O si prefieres, puedes hacer clic directamente en el siguiente enlace:</p>
              <p><a href="${url}" style="color: #2563eb;">Restablecer mi contraseña</a></p>
              <p style="color: #71717a; font-size: 12px; margin-top: 24px;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
            </div>
          `,
        });
      } catch (err) {
        console.error("Error enviando email de reset de contraseña:", err);
      }
    },
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