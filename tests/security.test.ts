import { describe, expect, it, vi } from "vitest";
import {
  ApiError,
  secureRoute,
} from "../lib/security/errors";
import {
  clientIpFromHeaders,
  consumeRateLimit,
  deriveIdentifierHash,
} from "../lib/security/rateLimit";
import { parseJsonObject } from "../lib/security/request";
import {
  parseBirthDateCivil,
  parseJsonRecord,
  parseMoney,
  parseNewPassword,
} from "../lib/security/validation";

const SECRET = "segredo-de-teste-com-mais-de-trinta-e-dois-bytes";

describe("identificadores e rate limiting", () => {
  it("deriva HMAC estavel sem armazenar o IP puro", () => {
    const first = deriveIdentifierHash("ip", "203.0.113.7", SECRET);
    const second = deriveIdentifierHash("ip", "203.0.113.7", SECRET);
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("203.0.113.7");
    expect(deriveIdentifierHash("user", "203.0.113.7", SECRET)).not.toBe(first);
  });

  it("normaliza apenas enderecos IP validos dos headers", () => {
    expect(
      clientIpFromHeaders(
        new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
      ),
    ).toBe("203.0.113.7");
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "invalido" }))).toBe(
      "unknown",
    );
  });

  it("rejeita atomicamente depois do limite e informa Retry-After", async () => {
    let count = 0;
    const client = {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      upsert: vi.fn(async () => ({ count: ++count })),
    };
    const hash = deriveIdentifierHash("user", "usuario-a", SECRET);
    const policy = { action: "test:write", limit: 2, windowMs: 60_000 };
    const now = new Date("2026-07-22T12:00:10.000Z");

    await expect(consumeRateLimit(hash, policy, { client, now })).resolves.toMatchObject({
      remaining: 1,
    });
    await expect(consumeRateLimit(hash, policy, { client, now })).resolves.toMatchObject({
      remaining: 0,
    });
    await expect(consumeRateLimit(hash, policy, { client, now })).rejects.toMatchObject({
      status: 429,
      retryAfterSeconds: 50,
    });
    expect(client.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({ update: { count: { increment: 1 }, expiresAt: expect.any(Date) } }),
    );
  });
});

describe("fronteira HTTP", () => {
  it("aceita JSON same-origin dentro do limite", async () => {
    const request = new Request("https://www.gennys.com.br/api/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://www.gennys.com.br",
      },
      body: JSON.stringify({ ok: true }),
    });
    await expect(parseJsonObject(request, 1_024)).resolves.toEqual({ ok: true });
  });

  it("bloqueia origem, content-type e corpo acima do limite", async () => {
    const crossSite = new Request("https://www.gennys.com.br/api/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.example",
      },
      body: "{}",
    });
    await expect(parseJsonObject(crossSite, 1_024)).rejects.toMatchObject({
      status: 403,
    });

    const text = new Request("https://www.gennys.com.br/api/test", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "{}",
    });
    await expect(parseJsonObject(text, 1_024)).rejects.toMatchObject({ status: 415 });

    const large = new Request("https://www.gennys.com.br/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(100) }),
    });
    await expect(parseJsonObject(large, 32)).rejects.toMatchObject({ status: 413 });
  });

  it("nunca devolve detalhe bruto de erro e sempre usa no-store", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await secureRoute("test:error", async () => {
      throw new Error("senha-sentinela-nao-pode-vazar");
    });
    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.text()).not.toContain("senha-sentinela");
    expect(JSON.stringify(log.mock.calls)).not.toContain("senha-sentinela");
    log.mockRestore();
  });
});

describe("validacao de dominio", () => {
  it("trata nascimento como data civil e rejeita calendario/futuro", () => {
    expect(parseBirthDateCivil("2024-02-29")).toBe("2024-02-29");
    expect(() => parseBirthDateCivil("2025-02-29")).toThrow(ApiError);
    expect(() => parseBirthDateCivil("2999-01-01")).toThrow(ApiError);
  });

  it("respeita o limite em bytes do bcrypt e centavos financeiros", () => {
    expect(parseNewPassword("é".repeat(36))).toHaveLength(36);
    expect(() => parseNewPassword("é".repeat(37))).toThrow(ApiError);
    expect(parseMoney(10.25)).toBe(10.25);
    expect(() => parseMoney(-1)).toThrow(ApiError);
    expect(() => parseMoney(10.001)).toThrow(ApiError);
  });

  it("rejeita chaves perigosas e estruturas JSON excessivas", () => {
    expect(() => parseJsonRecord(JSON.parse('{"__proto__":{"x":1}}'))).toThrow(
      ApiError,
    );
    expect(() => parseJsonRecord({ list: Array.from({ length: 101 }, () => 1) })).toThrow(
      ApiError,
    );
  });
});
