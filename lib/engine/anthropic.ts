import Anthropic from "@anthropic-ai/sdk";
import type { Categorizacao, ImagemEntrada, TurnoHistorico } from "./types";
import { extrairJSON, normalizarCategorizacao } from "./parseCategorizacao";

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

  return normalizarCategorizacao(extrairJSON(textoResposta));
}

export async function responderTexto(params: {
  systemPrompt: string;
  pergunta: string;
}): Promise<string> {
  const resposta = await getCliente().messages.create({
    model: MODELO,
    max_tokens: 300,
    system: params.systemPrompt,
    messages: [{ role: "user", content: params.pergunta }],
  });

  return resposta.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}
