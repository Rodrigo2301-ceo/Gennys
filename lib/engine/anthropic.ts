import Anthropic from "@anthropic-ai/sdk";
import type { Categorizacao, ImagemEntrada, TurnoHistorico } from "./types";

// Modelo definido no CLAUDE.md. Key sempre no servidor (ANTHROPIC_API_KEY).
const MODELO = "claude-sonnet-4-6";

let cliente: Anthropic | null = null;

function getCliente(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY não configurada no ambiente.");
  }
  if (!cliente) {
    cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return cliente;
}

const TIPOS_VALIDOS = ["financa", "tarefa", "nota", "habito", "estudo"];

function extrairJSON(texto: string): unknown {
  const limpo = texto.replace(/```json/gi, "").replace(/```/g, "").trim();
  const inicio = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (inicio === -1 || fim === -1 || fim < inicio) {
    throw new Error("Resposta da IA sem JSON reconhecível.");
  }
  return JSON.parse(limpo.slice(inicio, fim + 1));
}

function normalizar(bruto: unknown): Categorizacao {
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

export async function categorizar(params: {
  systemPrompt: string;
  historico?: TurnoHistorico[];
  texto?: string;
  imagem?: ImagemEntrada;
}): Promise<Categorizacao> {
  const { systemPrompt, historico = [], texto, imagem } = params;

  const messages: Anthropic.MessageParam[] = historico.map((t) => ({
    role: t.autor === "usuario" ? "user" : "assistant",
    content: t.texto,
  }));

  const conteudoAtual: Anthropic.ContentBlockParam[] = [];
  if (imagem) {
    conteudoAtual.push({
      type: "image",
      source: {
        type: "base64",
        media_type: imagem.mediaType as
          | "image/jpeg"
          | "image/png"
          | "image/gif"
          | "image/webp",
        data: imagem.base64,
      },
    });
    conteudoAtual.push({
      type: "text",
      text:
        texto?.trim() ||
        "Esta é uma foto de uma nota fiscal ou cupom. Extraia os dados financeiros.",
    });
  } else {
    conteudoAtual.push({ type: "text", text: texto?.trim() || "" });
  }

  messages.push({ role: "user", content: conteudoAtual });

  const resposta = await getCliente().messages.create({
    model: MODELO,
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const textoResposta = resposta.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return normalizar(extrairJSON(textoResposta));
}
