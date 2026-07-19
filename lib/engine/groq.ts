// Provedor Groq (groq.com — não confundir com o Grok da xAI). Free tier real,
// roda modelos abertos (Llama) com API compatível com o formato OpenAI.
// O free tier atual não tem modelo com visão: fotos são recusadas com um
// aviso amigável sugerindo o Gemini.

import type { Categorizacao, ImagemEntrada, TurnoHistorico } from "./types";
import { extrairJSON, normalizarCategorizacao } from "./parseCategorizacao";

const MODELO = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

function getApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY não configurada no ambiente.");
  return key;
}

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function chamarGroq(params: {
  messages: GroqMessage[];
  maxTokens: number;
}): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: MODELO,
      messages: params.messages,
      max_tokens: params.maxTokens,
    }),
  });

  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    throw new Error(`Groq respondeu ${res.status}: ${corpo.slice(0, 300)}`);
  }

  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? "").trim();
}

export async function categorizar(params: {
  systemPrompt: string;
  historico?: TurnoHistorico[];
  texto?: string;
  imagem?: ImagemEntrada;
}): Promise<Categorizacao> {
  const { systemPrompt, historico = [], texto, imagem } = params;

  // confianca 0 força o fluxo "pergunta": nada é salvo e o aviso chega ao chat.
  if (imagem) {
    return {
      tipo: "nota",
      confianca: 0,
      categoria: null,
      valor: null,
      dados: {},
      resposta: "Esse cérebro (Llama) ainda não lê fotos.",
      pergunta: "Troca pro Gemini no seletor aí em cima que eu leio sua nota na hora! 📸",
      memorias: [],
    };
  }

  const messages: GroqMessage[] = [{ role: "system", content: systemPrompt }];
  for (const t of historico) {
    messages.push({
      role: t.autor === "usuario" ? "user" : "assistant",
      content: t.texto,
    });
  }
  messages.push({ role: "user", content: texto?.trim() || "" });

  const textoResposta = await chamarGroq({ messages, maxTokens: 1024 });
  return normalizarCategorizacao(extrairJSON(textoResposta));
}

export async function responderTexto(params: {
  systemPrompt: string;
  pergunta: string;
}): Promise<string> {
  return chamarGroq({
    messages: [
      { role: "system", content: params.systemPrompt },
      { role: "user", content: params.pergunta },
    ],
    maxTokens: 300,
  });
}
