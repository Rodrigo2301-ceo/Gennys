// Provedor Gemini (Google). Chamado via REST direto (sem SDK) — evita
// dependência extra pra uma integração simples de texto+imagem.

import type { Categorizacao, ImagemEntrada, TurnoHistorico } from "./types";
import { extrairJSON, normalizarCategorizacao } from "./parseCategorizacao";

const MODELO = process.env.GEMINI_MODEL || "gemini-flash-latest";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY não configurada no ambiente.");
  return key;
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

async function chamarGemini(params: {
  systemPrompt: string;
  contents: { role: "user" | "model"; parts: GeminiPart[] }[];
  maxOutputTokens: number;
}): Promise<string> {
  const res = await fetch(`${ENDPOINT}?key=${getApiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: params.systemPrompt }] },
      contents: params.contents,
      generationConfig: {
        maxOutputTokens: params.maxOutputTokens,
        // Modelos 2.5+ "pensam" antes de responder e isso consome os tokens de
        // saída. Categorização/respostas curtas não precisam disso.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    throw new Error(`Gemini respondeu ${res.status}: ${corpo.slice(0, 300)}`);
  }

  const data = await res.json();
  const partes = data?.candidates?.[0]?.content?.parts ?? [];
  return partes
    .map((p: GeminiPart) => p.text ?? "")
    .join("")
    .trim();
}

export async function categorizar(params: {
  systemPrompt: string;
  historico?: TurnoHistorico[];
  texto?: string;
  imagem?: ImagemEntrada;
}): Promise<Categorizacao> {
  const { systemPrompt, historico = [], texto, imagem } = params;

  const contents: { role: "user" | "model"; parts: GeminiPart[] }[] =
    historico.map((t) => ({
      role: t.autor === "usuario" ? "user" : "model",
      parts: [{ text: t.texto }],
    }));

  const partesAtuais: GeminiPart[] = [];
  if (imagem) {
    partesAtuais.push({
      inlineData: { mimeType: imagem.mediaType, data: imagem.base64 },
    });
    partesAtuais.push({
      text:
        texto?.trim() ||
        "Esta é uma foto de uma nota fiscal ou cupom. Extraia os dados financeiros.",
    });
  } else {
    partesAtuais.push({ text: texto?.trim() || "" });
  }
  contents.push({ role: "user", parts: partesAtuais });

  const textoResposta = await chamarGemini({
    systemPrompt,
    contents,
    maxOutputTokens: 1024,
  });

  return normalizarCategorizacao(extrairJSON(textoResposta));
}

export async function responderTexto(params: {
  systemPrompt: string;
  pergunta: string;
}): Promise<string> {
  return chamarGemini({
    systemPrompt: params.systemPrompt,
    contents: [{ role: "user", parts: [{ text: params.pergunta }] }],
    maxOutputTokens: 300,
  });
}
