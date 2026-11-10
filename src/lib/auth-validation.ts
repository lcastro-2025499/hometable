import { z } from "zod";

// Regex para validación de email más estricta
// Permite: letters, numbers, dots, hyphens, underscores en local-part
// Dominio debe tener al menos un dot y TLD válido (2+ letras)
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const loginSchema = z.object({
  emailOrUsername: z.string().min(1, "El correo o nombre de usuario es obligatorio."),
  password: z.string().min(1, "La contraseña es obligatoria."),
  rememberMe: z.boolean().optional(),
});

export type LoginSchema = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    firstName: z.string().min(1, "El nombre es obligatorio.").max(50, "Máximo 50 caracteres."),
    lastName: z.string().min(1, "El apellido es obligatorio.").max(50, "Máximo 50 caracteres."),
    username: z
      .string()
      .min(3, "El nombre de usuario debe tener entre 3 y 15 caracteres.")
      .max(15, "El nombre de usuario debe tener entre 3 y 15 caracteres.")
      .regex(/^[a-zA-Z0-9_]+$/, "Solo se permiten letras, números y guiones bajos."),
    email: z.string().regex(emailRegex, "Correo electrónico no válido."),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres.")
      .refine((val) => /[A-Z]/.test(val), "Debe contener al menos una letra mayúscula.")
      .refine((val) => (val.match(/\d/g) || []).length >= 2, "Debe contener al menos dos números."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type RegisterSchema = z.infer<typeof registerSchema>;

/** Correo normalizado (minúsculas) reutilizable en formularios y API. */
export const emailSchema = z
  .string()
  .trim()
  .regex(emailRegex, "Correo electrónico no válido.")
  .transform((value) => value.toLowerCase());

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "El código de verificación es obligatorio."),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres.")
      .refine((val) => /[A-Z]/.test(val), "Debe contener al menos una letra mayúscula.")
      .refine((val) => (val.match(/\d/g) || []).length >= 2, "Debe contener al menos dos números."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;

/** Payload que acepta la ruta de registro en el servidor. */
export const registerPayloadSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es obligatorio.").max(50, "Máximo 50 caracteres."),
  lastName: z.string().trim().min(1, "El apellido es obligatorio.").max(50, "Máximo 50 caracteres."),
  username: z
    .string()
    .trim()
    .min(3, "El nombre de usuario debe tener entre 3 y 15 caracteres.")
    .max(15, "El nombre de usuario debe tener entre 3 y 15 caracteres.")
    .regex(/^[a-zA-Z0-9_]+$/, "Solo se permiten letras, números y guiones bajos."),
  email: emailSchema,
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(128, "La contraseña no puede superar 128 caracteres.")
    .refine((val) => /[A-Z]/.test(val), "Debe contener al menos una letra mayúscula.")
    .refine((val) => (val.match(/\d/g) || []).length >= 2, "Debe contener al menos dos números."),
  name: z.string().trim().min(1, "El nombre completo es obligatorio."),
  recaptchaToken: z.string().min(1, "Completa la verificación de reCAPTCHA."),
});

export type RegisterPayload = z.infer<typeof registerPayloadSchema>;

export const verifyEmailSchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, "El código debe tener 6 dígitos."),
});

export type VerifyEmailSchema = z.infer<typeof verifyEmailSchema>;