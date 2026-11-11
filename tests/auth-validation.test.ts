import { describe, expect, it } from "vitest";

import {
  emailSchema,
  loginSchema,
  passwordSchema,
  registerPayloadSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "@/lib/auth-validation";

describe("passwordSchema", () => {
  it("acepta una contraseña con mayúscula y dos números", () => {
    expect(passwordSchema.safeParse("Segura123").success).toBe(true);
  });

  it("rechaza contraseñas cortas, sin mayúscula o con un solo número", () => {
    expect(passwordSchema.safeParse("Ab1").success).toBe(false);
    expect(passwordSchema.safeParse("segura123").success).toBe(false);
    expect(passwordSchema.safeParse("Segura12x").success).toBe(true);
    expect(passwordSchema.safeParse("Segura1").success).toBe(false);
  });
});

describe("emailSchema", () => {
  it("recorta y pasa a minúsculas", () => {
    expect(emailSchema.parse("  Persona@Ejemplo.COM ")).toBe(
      "persona@ejemplo.com",
    );
  });

  it("rechaza dominios sin TLD", () => {
    expect(emailSchema.safeParse("persona@ejemplo").success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = {
    firstName: "Ana",
    lastName: "Pérez",
    username: "ana_perez",
    email: "ana@ejemplo.com",
    password: "Segura123",
    confirmPassword: "Segura123",
  };

  it("acepta un registro válido", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("exige que las contraseñas coincidan", () => {
    const result = registerSchema.safeParse({
      ...valid,
      confirmPassword: "Distinta123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
    }
  });

  it("limita el nombre de usuario a letras, números y guion bajo", () => {
    expect(
      registerSchema.safeParse({ ...valid, username: "ana pérez" }).success,
    ).toBe(false);
  });
});

describe("loginSchema y resetPasswordSchema", () => {
  it("exige credenciales no vacías", () => {
    expect(loginSchema.safeParse({ emailOrUsername: "", password: "" }).success).toBe(false);
    expect(
      loginSchema.safeParse({ emailOrUsername: "ana", password: "x", rememberMe: true })
        .success,
    ).toBe(true);
  });

  it("exige coincidencia de contraseñas al restablecer", () => {
    expect(
      resetPasswordSchema.safeParse({
        token: "abc",
        password: "Segura123",
        confirmPassword: "Segura123",
      }).success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({
        token: "abc",
        password: "Segura123",
        confirmPassword: "Otra1234",
      }).success,
    ).toBe(false);
  });
});

describe("payloads del servidor", () => {
  it("registerPayloadSchema exige reCAPTCHA y nombre completo", () => {
    const base = {
      firstName: "Ana",
      lastName: "Pérez",
      username: "ana_perez",
      email: "ana@ejemplo.com",
      password: "Segura123",
      name: "Ana Pérez",
      recaptchaToken: "token",
    };

    expect(registerPayloadSchema.safeParse(base).success).toBe(true);
    expect(
      registerPayloadSchema.safeParse({ ...base, recaptchaToken: "" }).success,
    ).toBe(false);
  });

  it("verifyEmailSchema exige exactamente seis dígitos", () => {
    expect(
      verifyEmailSchema.safeParse({ email: "ana@ejemplo.com", otp: "123456" })
        .success,
    ).toBe(true);
    expect(
      verifyEmailSchema.safeParse({ email: "ana@ejemplo.com", otp: "12345" })
        .success,
    ).toBe(false);
    expect(
      verifyEmailSchema.safeParse({ email: "ana@ejemplo.com", otp: "12345a" })
        .success,
    ).toBe(false);
  });
});
