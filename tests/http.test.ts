import { describe, expect, it, vi, afterEach } from "vitest";

import { clientIp, isSameOrigin, readJsonBody } from "@/lib/http";

function jsonRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/tasks", {
    method: "POST",
    body,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("readJsonBody", () => {
  it("parsea un JSON válido", async () => {
    const result = await readJsonBody(jsonRequest('{"tasks":[]}'));

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual({ tasks: [] });
  });

  it("rechaza JSON malformado con 400", async () => {
    const result = await readJsonBody(jsonRequest("{no es json"));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });

  it("rechaza por Content-Length si supera el límite", async () => {
    const result = await readJsonBody(
      jsonRequest('{"data":"x"}', { "content-length": "2048" }),
      1024,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });

  it("corta el streaming cuando el cuerpo real supera el límite", async () => {
    const body = "x".repeat(4096);
    const result = await readJsonBody(jsonRequest(JSON.stringify({ body })), 1024);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });
});

describe("isSameOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("acepta el mismo origen", () => {
    const request = new Request("http://localhost/api/tasks", {
      headers: { origin: "http://localhost" },
    });

    expect(isSameOrigin(request)).toBe(true);
  });

  it("rechaza otro origen y peticiones sin Origin", () => {
    const foreign = new Request("http://localhost/api/tasks", {
      headers: { origin: "https://evil.example" },
    });

    expect(isSameOrigin(foreign)).toBe(false);
    expect(isSameOrigin(new Request("http://localhost/api/tasks"))).toBe(false);
  });

  it("acepta el origen configurado en BETTER_AUTH_URL", () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://hometable.example");
    const request = new Request("http://localhost/api/tasks", {
      headers: { origin: "https://hometable.example" },
    });

    expect(isSameOrigin(request)).toBe(true);
  });
});

describe("clientIp", () => {
  it("prefiere x-real-ip sobre x-forwarded-for", () => {
    const request = new Request("http://localhost/", {
      headers: {
        "x-real-ip": "203.0.113.9",
        "x-forwarded-for": "198.51.100.7, 10.0.0.1",
      },
    });

    expect(clientIp(request)).toBe("203.0.113.9");
  });

  it("usa la primera IP de x-forwarded-for y valida el formato", () => {
    expect(
      clientIp(
        new Request("http://localhost/", {
          headers: { "x-forwarded-for": "198.51.100.7, 10.0.0.1" },
        }),
      ),
    ).toBe("198.51.100.7");

    expect(
      clientIp(
        new Request("http://localhost/", {
          headers: { "x-forwarded-for": "no-es-una-ip" },
        }),
      ),
    ).toBe("unknown");
  });

  it("devuelve unknown si no hay cabeceras", () => {
    expect(clientIp(new Request("http://localhost/"))).toBe("unknown");
  });
});
