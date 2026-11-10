import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import { hashPassword } from "better-auth/crypto";

import { auth } from "./auth";
import { pool } from "./db";
import { sendEmail, verificationCodeEmail } from "./email";

/**
 * Registros pendientes de verificación.
 *
 * El usuario no existe en Better Auth hasta que confirma el código enviado a
 * su correo. Mientras tanto solo guardamos lo mínimo indispensable: sus datos
 * de perfil, la contraseña ya hasheada y el hash del OTP.
 */

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutos
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const PENDING_RETENTION_HOURS = 24;
const UNVERIFIED_USER_TTL_HOURS = 24;
const FALLBACK_SECRET = "hometable_better_auth_secret_key_32bytes_long!";

interface PendingRow {
  id: string;
  email: string;
  username: string;
  display_username: string;
  name: string;
  first_name: string;
  last_name: string;
  password_hash: string;
  otp_hash: string;
  otp_expires_at: Date;
  attempts: number;
  sent_at: Date;
}

interface UserConflictRow {
  id: string;
  emailVerified: boolean;
}

export interface PendingRegistrationInput {
  email: string;
  username: string;
  displayUsername: string;
  name: string;
  firstName: string;
  lastName: string;
  password: string;
}

export type RegisterPendingResult =
  | { status: "sent" }
  | { status: "email_taken" }
  | { status: "username_taken" }
  | { status: "delivery_failed"; error: unknown };

export type VerifyPendingResult =
  | { status: "verified"; userId: string }
  | { status: "not_found" }
  | { status: "expired" }
  | { status: "invalid"; attemptsLeft: number }
  | { status: "too_many_attempts" }
  | { status: "email_taken" }
  | { status: "username_taken" };

export type ResendPendingResult =
  | { status: "sent" }
  | { status: "not_found" }
  | { status: "cooldown"; retryAfterSeconds: number }
  | { status: "delivery_failed"; error: unknown };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function otpSecret(): string {
  return process.env.BETTER_AUTH_SECRET || FALLBACK_SECRET;
}

function hashOtp(otp: string): string {
  return createHmac("sha256", otpSecret()).update(otp).digest("hex");
}

function safeEqualHex(aHex: string, bHex: string): boolean {
  if (!/^[0-9a-f]+$/i.test(aHex) || !/^[0-9a-f]+$/i.test(bHex)) return false;

  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");

  if (a.length === 0 || a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

function generateOtp(): string {
  return randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505",
  );
}

/**
 * Limpia registros pendientes que ya nadie va a verificar. Mantenerlos unas
 * horas permite reenviar el código sin tener que volver a llenar el formulario.
 */
async function purgeStalePendingRegistrations(): Promise<void> {
  await pool.query(
    `delete from public.pending_registration
     where created_at < now() - ($1::int * interval '1 hour')`,
    [PENDING_RETENTION_HOURS],
  );
}

/**
 * Elimina cuentas antiguas que quedaron sin verificar con el flujo anterior.
 * No toca cuentas verificadas ni registros recientes.
 */
async function deleteStaleUnverifiedUsers(): Promise<void> {
  await pool.query(
    `delete from public."user"
     where "emailVerified" = false
       and "createdAt" < now() - ($1::int * interval '1 hour')`,
    [UNVERIFIED_USER_TTL_HOURS],
  );
}

async function findUserByEmail(email: string): Promise<UserConflictRow | null> {
  const { rows } = await pool.query<UserConflictRow>(
    `select id, "emailVerified" from public."user" where lower(email) = $1 limit 1`,
    [email],
  );
  return rows[0] ?? null;
}

async function findUserByUsername(username: string): Promise<UserConflictRow | null> {
  const { rows } = await pool.query<UserConflictRow>(
    `select id, "emailVerified" from public."user" where lower(username) = $1 limit 1`,
    [username],
  );
  return rows[0] ?? null;
}

async function deleteUnverifiedUser(id: string): Promise<void> {
  await pool.query(
    `delete from public."user" where id = $1 and "emailVerified" = false`,
    [id],
  );
}

/**
 * Comprueba si el email o el username pertenecen ya a una cuenta verificada.
 * Si pertenecen a una cuenta sin verificar (resto del flujo anterior) la
 * elimina, porque nunca tuvo acceso real y bloqueaba el registro.
 */
async function resolveUserConflicts(
  email: string,
  username: string,
): Promise<"email_taken" | "username_taken" | null> {
  const emailOwner = await findUserByEmail(email);
  if (emailOwner) {
    if (emailOwner.emailVerified) return "email_taken";
    await deleteUnverifiedUser(emailOwner.id);
  }

  const usernameOwner = await findUserByUsername(username);
  if (usernameOwner) {
    if (usernameOwner.emailVerified) return "username_taken";
    await deleteUnverifiedUser(usernameOwner.id);
  }

  return null;
}

async function findVerifiedConflict(
  email: string,
  username: string,
): Promise<"email_taken" | "username_taken" | null> {
  const emailOwner = await findUserByEmail(email);
  if (emailOwner?.emailVerified) return "email_taken";

  const usernameOwner = await findUserByUsername(username);
  if (usernameOwner?.emailVerified) return "username_taken";

  return null;
}

function conflictFromError(error: unknown): "email_taken" | "username_taken" | null {
  if (!error || typeof error !== "object") return null;

  const message = "message" in error ? String((error as { message?: unknown }).message ?? "").toLowerCase() : "";

  if (!isUniqueViolation(error) && !/taken|already|exists|unique/.test(message)) {
    return null;
  }

  if (message.includes("username")) return "username_taken";
  if (message.includes("email")) return "email_taken";

  return null;
}

async function restorePendingRow(row: PendingRow): Promise<void> {
  await pool.query(
    `insert into public.pending_registration
       (id, email, username, display_username, name, first_name, last_name,
        password_hash, otp_hash, otp_expires_at, attempts, sent_at, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), now())
     on conflict (id) do nothing`,
    [
      row.id,
      row.email,
      row.username,
      row.display_username,
      row.name,
      row.first_name,
      row.last_name,
      row.password_hash,
      row.otp_hash,
      row.otp_expires_at,
      row.attempts,
      row.sent_at,
    ],
  );
}

/**
 * Guarda (o reemplaza) el registro pendiente y envía el código de verificación.
 *
 * Política "el último gana": si el mismo email o username ya tenía un registro
 * pendiente se reemplaza. Es lo que permite corregir un correo mal escrito sin
 * quedar bloqueado.
 */
export async function registerPending(
  input: PendingRegistrationInput,
): Promise<RegisterPendingResult> {
  const email = normalizeEmail(input.email);
  const username = normalizeUsername(input.username);
  const displayUsername = input.displayUsername.trim() || input.username.trim();
  const name = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();

  await purgeStalePendingRegistrations();
  await deleteStaleUnverifiedUsers();

  const conflict = await resolveUserConflicts(email, username);
  if (conflict) return { status: conflict };

  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const passwordHash = await hashPassword(input.password);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  // Limpia cualquier pendiente previo con el mismo email o username.
  await pool.query(
    `delete from public.pending_registration
     where lower(email) = $1 or lower(username) = $2`,
    [email, username],
  );

  try {
    await pool.query(
      `insert into public.pending_registration
         (email, username, display_username, name, first_name, last_name,
          password_hash, otp_hash, otp_expires_at, attempts, sent_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, now())`,
      [
        email,
        username,
        displayUsername,
        name,
        input.firstName.trim(),
        input.lastName.trim(),
        passwordHash,
        otpHash,
        expiresAt,
      ],
    );
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    // Otra petición ganó la carrera: reintenta leer el conflicto real.
    const retry = await resolveUserConflicts(email, username);
    return { status: retry ?? "email_taken" };
  }

  try {
    const { subject, html } = verificationCodeEmail(input.firstName, otp);
    await sendEmail({ to: email, subject, html });
  } catch (error) {
    // Si no se puede entregar el código, no dejamos un registro pendiente
    // inútil: el usuario puede reintentar el formulario de inmediato.
    await discardPendingRegistration(email);
    return { status: "delivery_failed", error };
  }

  return { status: "sent" };
}

/**
 * Verifica el OTP y, solo si es correcto, crea la cuenta real en Better Auth.
 */
export async function verifyPendingRegistration(
  rawEmail: string,
  otp: string,
): Promise<VerifyPendingResult> {
  const email = normalizeEmail(rawEmail);

  await purgeStalePendingRegistrations();

  const { rows } = await pool.query<PendingRow>(
    `select * from public.pending_registration where lower(email) = $1 limit 1`,
    [email],
  );
  const pending = rows[0];

  if (!pending) return { status: "not_found" };
  if (pending.attempts >= MAX_ATTEMPTS) return { status: "too_many_attempts" };

  if (new Date(pending.otp_expires_at).getTime() <= Date.now()) {
    return { status: "expired" };
  }

  if (!safeEqualHex(hashOtp(otp), pending.otp_hash)) {
    const { rows: updated } = await pool.query<{ attempts: number }>(
      `update public.pending_registration
       set attempts = attempts + 1, updated_at = now()
       where id = $1
       returning attempts`,
      [pending.id],
    );

    const attempts = updated[0]?.attempts ?? MAX_ATTEMPTS;
    return attempts >= MAX_ATTEMPTS
      ? { status: "too_many_attempts" }
      : { status: "invalid", attemptsLeft: MAX_ATTEMPTS - attempts };
  }

  // Consume el código de forma atómica: si dos peticiones llegan a la vez,
  // solo una puede crear la cuenta.
  const { rows: claimedRows } = await pool.query<PendingRow>(
    `delete from public.pending_registration
     where id = $1 and otp_hash = $2
     returning *`,
    [pending.id, pending.otp_hash],
  );
  const claimed = claimedRows[0];

  if (!claimed) {
    return { status: "invalid", attemptsLeft: 0 };
  }

  const conflict = await findVerifiedConflict(claimed.email, claimed.username);
  if (conflict) return { status: conflict };

  const context = await auth.$context;
  let createdUserId: string | null = null;

  try {
    const created = await context.internalAdapter.createUser(
      {
        email: claimed.email,
        name: claimed.name,
        emailVerified: true,
        username: claimed.username,
        displayUsername: claimed.display_username,
        firstName: claimed.first_name,
        lastName: claimed.last_name,
      },
      { method: "email-password" },
    );

    createdUserId = created.id;

    await context.internalAdapter.linkAccount({
      userId: created.id,
      providerId: "credential",
      accountId: created.id,
      password: claimed.password_hash,
    });

    return { status: "verified", userId: created.id };
  } catch (error) {
    if (createdUserId) {
      await pool.query(`delete from public."user" where id = $1`, [createdUserId]).catch(() => {
        // La cuenta quedó incompleta; se ignora el fallo de limpieza.
      });
    }

    const conflictFromCreate = conflictFromError(error);
    if (conflictFromCreate) return { status: conflictFromCreate };

    // Error transitorio: devolvemos el pendiente para que el código siga vivo.
    await restorePendingRow(claimed).catch(() => undefined);
    throw error;
  }
}

/**
 * Genera y envía un código nuevo para un registro pendiente.
 */
export async function resendPendingCode(rawEmail: string): Promise<ResendPendingResult> {
  const email = normalizeEmail(rawEmail);

  await purgeStalePendingRegistrations();

  const { rows } = await pool.query<PendingRow>(
    `select * from public.pending_registration where lower(email) = $1 limit 1`,
    [email],
  );
  const pending = rows[0];

  if (!pending) return { status: "not_found" };

  const elapsedSeconds = (Date.now() - new Date(pending.sent_at).getTime()) / 1000;
  if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
    return {
      status: "cooldown",
      retryAfterSeconds: Math.max(1, Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds)),
    };
  }

  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const { rows: updated } = await pool.query<PendingRow>(
    `update public.pending_registration
     set otp_hash = $2,
         otp_expires_at = $3,
         attempts = 0,
         sent_at = now(),
         updated_at = now()
     where id = $1
     returning *`,
    [pending.id, otpHash, expiresAt],
  );

  const rotated = updated[0];
  if (!rotated) return { status: "not_found" };

  try {
    const { subject, html } = verificationCodeEmail(pending.first_name, otp);
    await sendEmail({ to: email, subject, html });
  } catch (error) {
    // Restaura el código anterior para no invalidar el que el usuario ya tenía.
    await pool.query(
      `update public.pending_registration
       set otp_hash = $2,
           otp_expires_at = $3,
           attempts = $4,
           sent_at = $5,
           updated_at = now()
       where id = $1`,
      [pending.id, pending.otp_hash, pending.otp_expires_at, pending.attempts, pending.sent_at],
    ).catch(() => undefined);

    return { status: "delivery_failed", error };
  }

  return { status: "sent" };
}

/**
 * Elimina el registro pendiente de un correo (por ejemplo si el envío falla).
 */
export async function discardPendingRegistration(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  await pool.query(`delete from public.pending_registration where lower(email) = $1`, [email]);
}
