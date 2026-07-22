import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  criarTokenConfirmacao,
  verificarTokenConfirmacao,
} from "../lib/ai/confirmation";
import {
  ConfirmacaoInvalidaError,
  EntradaInvalidaError,
  SaidaIaInvalidaError,
} from "../lib/engine/errors";
import { validarEntradaMotor } from "../lib/engine/inputValidation";
import {
  extrairJSON,
  normalizarCategorizacao,
} from "../lib/engine/parseCategorizacao";
import type { PropostaEntrada } from "../lib/engine/types";

const segredoAnterior = process.env.SECURITY_HMAC_SECRET;

beforeAll(() => {
  process.env.SECURITY_HMAC_SECRET = "teste-local-sem-credencial-real-1234567890";
});

afterAll(() => {
  if (segredoAnterior === undefined) delete process.env.SECURITY_HMAC_SECRET;
  else process.env.SECURITY_HMAC_SECRET = segredoAnterior;
});

describe("validação da entrada de IA", () => {
  it("normaliza texto e limita o histórico", () => {
    const entrada = validarEntradaMotor("usuario-teste", {
      texto: "  lembrete local  ",
      historico: [{ autor: "usuario", texto: " contexto " }],
    });
    expect(entrada.texto).toBe("lembrete local");
    expect(entrada.historico?.[0].texto).toBe("contexto");
  });

  it("rejeita texto e histórico acima dos limites", () => {
    expect(() =>
      validarEntradaMotor("usuario-teste", { texto: "x".repeat(4_001) }),
    ).toThrow(EntradaInvalidaError);
    expect(() =>
      validarEntradaMotor("usuario-teste", {
        texto: "ok",
        historico: Array.from({ length: 9 }, () => ({
          autor: "usuario" as const,
          texto: "x",
        })),
      }),
    ).toThrow(EntradaInvalidaError);
  });

  it("confere assinatura mágica em vez de confiar no MIME declarado", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(() =>
      validarEntradaMotor("usuario-teste", {
        imagem: { base64: png.toString("base64"), mediaType: "image/png" },
      }),
    ).not.toThrow();
    expect(() =>
      validarEntradaMotor("usuario-teste", {
        imagem: { base64: png.toString("base64"), mediaType: "image/jpeg" },
      }),
    ).toThrow(EntradaInvalidaError);
  });
});

describe("contrato de saída do provedor", () => {
  const saidaValida = {
    tipo: "nota",
    confianca: 0.9,
    categoria: "geral",
    valor: null,
    dados: { titulo: "exemplo" },
    resposta: "Proposta pronta.",
    pergunta: null,
    memorias: [],
  };

  it("aceita somente o documento JSON completo e descarta memória sugerida", () => {
    const validada = normalizarCategorizacao(
      extrairJSON(JSON.stringify(saidaValida)),
    );
    expect(validada.tipo).toBe("nota");
    expect("memorias" in validada).toBe(false);
    expect(() => extrairJSON(`texto ${JSON.stringify(saidaValida)}`)).toThrow(
      SaidaIaInvalidaError,
    );
  });

  it("rejeita tipo, forma e campos inesperados", () => {
    expect(() =>
      normalizarCategorizacao({ ...saidaValida, tipo: "desconhecido" }),
    ).toThrow(SaidaIaInvalidaError);
    expect(() =>
      normalizarCategorizacao({ ...saidaValida, dados: [] }),
    ).toThrow(SaidaIaInvalidaError);
    expect(() =>
      normalizarCategorizacao({ ...saidaValida, extra: true }),
    ).toThrow(SaidaIaInvalidaError);
  });
});

describe("token HMAC de confirmação", () => {
  const proposta: PropostaEntrada = {
    tipo: "nota",
    confianca: 0.95,
    categoria: "geral",
    valor: null,
    dados: { titulo: "exemplo" },
  };
  const contexto = {
    provider: "gemini" as const,
    consentVersion: "versao-teste",
    purpose: "assistente",
  };
  const inicio = new Date("2026-07-22T12:00:00.000Z");

  it("vincula proposta e usuário sem colocar a proposta no token", () => {
    const criado = criarTokenConfirmacao("usuario-a", proposta, contexto, inicio);
    expect(criado.token).not.toContain("exemplo");
    expect(() =>
      verificarTokenConfirmacao(criado.token, "usuario-a", proposta, inicio),
    ).not.toThrow();
    expect(() =>
      verificarTokenConfirmacao(criado.token, "usuario-b", proposta, inicio),
    ).toThrow(ConfirmacaoInvalidaError);
    expect(() =>
      verificarTokenConfirmacao(
        criado.token,
        "usuario-a",
        { ...proposta, categoria: "alterada" },
        inicio,
      ),
    ).toThrow(ConfirmacaoInvalidaError);
  });

  it("rejeita token expirado", () => {
    const criado = criarTokenConfirmacao("usuario-a", proposta, contexto, inicio);
    const depoisDaExpiracao = new Date(inicio.getTime() + 10 * 60_000 + 1_000);
    expect(() =>
      verificarTokenConfirmacao(
        criado.token,
        "usuario-a",
        proposta,
        depoisDaExpiracao,
      ),
    ).toThrow(ConfirmacaoInvalidaError);
  });
});
