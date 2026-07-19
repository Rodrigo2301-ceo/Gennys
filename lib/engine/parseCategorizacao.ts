// Parsing/normalização da resposta JSON de categorização. Compartilhado por
// todos os provedores de IA (Claude, Gemini, Grok) — o contrato de saída é
// o mesmo independente de quem gerou o texto.

import type { Categorizacao } from "./types";

const TIPOS_VALIDOS = ["financa", "tarefa", "nota", "habito", "estudo"];

export function extrairJSON(texto: string): unknown {
  const limpo = texto.replace(/```json/gi, "").replace(/```/g, "").trim();
  const inicio = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (inicio === -1 || fim === -1 || fim < inicio) {
    throw new Error("Resposta da IA sem JSON reconhecível.");
  }
  return JSON.parse(limpo.slice(inicio, fim + 1));
}

export function normalizarCategorizacao(bruto: unknown): Categorizacao {
  const o = (bruto ?? {}) as Record<string, unknown>;

  const tipo = TIPOS_VALIDOS.includes(o.tipo as string)
    ? (o.tipo as Categorizacao["tipo"])
    : "nota";

  const confiancaNum = Number(o.confianca);
  const confianca = Number.isFinite(confiancaNum)
    ? Math.min(1, Math.max(0, confiancaNum))
    : 0;

  const valorNum = Number(o.valor);
  const valor =
    o.valor === null || o.valor === undefined || !Number.isFinite(valorNum)
      ? null
      : valorNum;

  const memoriasBruto = Array.isArray(o.memorias) ? o.memorias : [];
  const memorias = memoriasBruto
    .map((m) => {
      const mm = (m ?? {}) as Record<string, unknown>;
      return {
        fato: typeof mm.fato === "string" ? mm.fato.trim() : "",
        categoria: typeof mm.categoria === "string" ? mm.categoria : null,
      };
    })
    .filter((m) => m.fato.length > 0);

  return {
    tipo,
    confianca,
    categoria: typeof o.categoria === "string" ? o.categoria : null,
    valor,
    dados:
      o.dados && typeof o.dados === "object"
        ? (o.dados as Record<string, unknown>)
        : {},
    resposta:
      typeof o.resposta === "string" && o.resposta.trim()
        ? o.resposta.trim()
        : "Certo!",
    pergunta:
      typeof o.pergunta === "string" && o.pergunta.trim()
        ? o.pergunta.trim()
        : null,
    memorias,
  };
}
