import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig from "../next.config.mjs";

async function headersGlobais() {
  if (!nextConfig.headers) throw new Error("Next config sem headers.");
  const grupos = await nextConfig.headers();
  return new Map(grupos[0].headers.map((header) => [header.key, header.value]));
}

describe("headers e viewport", () => {
  it("permite microfone somente para a propria origem", async () => {
    const headers = await headersGlobais();
    expect(headers.get("Permissions-Policy")).toContain("microphone=(self)");
    expect(headers.get("Permissions-Policy")).not.toContain("microphone=()");
  });

  it("mantem uma CSP compativel com Next 14 e bloqueia objetos", async () => {
    const headers = await headersGlobais();
    const csp = headers.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    // Sem nonce por requisicao, Next 14 ainda precisa dos scripts inline atuais.
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
  });

  it("nao bloqueia zoom no viewport", () => {
    const layout = readFileSync(join(process.cwd(), "app", "layout.tsx"), "utf8");
    expect(layout).not.toMatch(/maximumScale\s*:/);
    expect(layout).not.toMatch(/userScalable\s*:\s*false/);
  });
});
