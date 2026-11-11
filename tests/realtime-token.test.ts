import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { signRealtimeToken } from "@/lib/realtime-token";

const SECRET = "secreto-de-prueba-suficientemente-largo";

function decodePart(part: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

describe("signRealtimeToken", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("firma un JWT HS256 con el sub del usuario y rol authenticated", () => {
    vi.stubEnv("SUPABASE_JWT_SECRET", SECRET);

    const { token, expiresAt } = signRealtimeToken("user-123");
    const [header, payload, signature] = token.split(".");

    expect(decodePart(header)).toEqual({ alg: "HS256", typ: "JWT" });
    expect(decodePart(payload)).toMatchObject({
      sub: "user-123",
      role: "authenticated",
      aud: "authenticated",
      exp: expiresAt,
    });

    const expected = createHmac("sha256", SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url");

    expect(signature).toBe(expected);
  });

  it("caduca en 15 minutos", () => {
    vi.stubEnv("SUPABASE_JWT_SECRET", SECRET);

    const before = Math.floor(Date.now() / 1000);
    const { expiresAt } = signRealtimeToken("user-123");
    const after = Math.floor(Date.now() / 1000);

    expect(expiresAt).toBeGreaterThanOrEqual(before + 15 * 60);
    expect(expiresAt).toBeLessThanOrEqual(after + 15 * 60);
  });

  it("falla de forma clara si falta el secreto", () => {
    vi.stubEnv("SUPABASE_JWT_SECRET", "");

    expect(() => signRealtimeToken("user-123")).toThrowError(
      /SUPABASE_JWT_SECRET/,
    );
  });
});
