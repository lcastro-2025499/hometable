import { Resend } from "resend";

/**
 * Utilidades de envío de correo. Este módulo solo se importa desde código de
 * servidor (rutas API y configuración de Better Auth).
 */

const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";

/**
 * Remitente de pruebas de Resend. Solo puede entregar al correo dueño de la
 * cuenta de Resend, por lo que se usa exclusivamente como último recurso
 * mientras el dominio de `EMAIL_FROM` termina de verificarse. En cuanto el
 * dominio esté verificado, el envío principal funciona y este fallback deja de
 * ejecutarse sin necesidad de cambios.
 */
const sandboxFromEmail = "onboarding@resend.dev";

function isUnverifiedDomainError(message: string): boolean {
  return /not verified|not_started|not started/i.test(message);
}

export class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envía un correo con Resend. Lanza `EmailDeliveryError` si el proveedor
 * rechaza el envío: preferimos fallar de forma cerrada antes que crear cuentas
 * que nunca podrán verificarse.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new EmailDeliveryError("RESEND_API_KEY no está configurada.");
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject,
    html,
  });

  if (!error) return;

  // Fallback temporal: si el dominio de EMAIL_FROM todavía no está verificado,
  // reintentamos desde el remitente de pruebas. Esto permite probar el flujo
  // mientras el DNS se propaga; el destinatario debe ser el correo dueño de la
  // cuenta de Resend. Una vez verificado el dominio, esta rama no se usa.
  if (isUnverifiedDomainError(error.message ?? "")) {
    const fallback = await resend.emails.send({
      from: sandboxFromEmail,
      to,
      subject,
      html,
    });

    if (!fallback.error) return;

    throw new EmailDeliveryError(fallback.error.message || error.message);
  }

  throw new EmailDeliveryError(error.message || "Resend rechazó el envío del correo.");
}

function layout(title: string, body: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
      <h2 style="color: #18181b;">${title}</h2>
      ${body}
      <p style="color: #71717a; font-size: 12px; margin-top: 24px;">Hometable · Si no solicitaste este correo, puedes ignorarlo.</p>
    </div>
  `;
}

export function verificationCodeEmail(name: string, otp: string): { subject: string; html: string } {
  const safeName = escapeHtml(name || "hola");
  const safeOtp = escapeHtml(otp);

  return {
    subject: "Tu código de verificación - Hometable",
    html: layout(
      "Verifica tu correo",
      `
        <p>Hola <strong>${safeName}</strong>,</p>
        <p>Usa este código para confirmar tu correo y activar tu cuenta. Caduca en 10 minutos:</p>
        <div style="background-color: #f4f4f5; padding: 12px 24px; font-size: 28px; font-weight: bold; letter-spacing: 8px; text-align: center; border-radius: 6px; margin: 16px 0;">
          ${safeOtp}
        </div>
        <p>Si no creaste una cuenta en Hometable, ignora este mensaje.</p>
      `,
    ),
  };
}

export function passwordResetEmail(name: string, token: string, url: string): { subject: string; html: string } {
  const safeName = escapeHtml(name || "hola");
  const safeToken = escapeHtml(token);
  const safeUrl = escapeHtml(url);

  return {
    subject: "Código para restablecer tu contraseña - Hometable",
    html: layout(
      "Restablecer contraseña",
      `
        <p>Hola <strong>${safeName}</strong>,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña. Tu código de verificación es:</p>
        <div style="background-color: #f4f4f5; padding: 12px 24px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; border-radius: 6px; margin: 16px 0;">
          ${safeToken}
        </div>
        <p>También puedes usar este enlace:</p>
        <p><a href="${safeUrl}" style="color: #2563eb;">Restablecer mi contraseña</a></p>
      `,
    ),
  };
}
