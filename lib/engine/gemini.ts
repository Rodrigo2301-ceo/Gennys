import type { Categorizacao, ImagemEntrada, TurnoHistorico } from "./types";
import { extrairJSON, normalizarCategorizacao } from "./parseCategorizacao";
import { ProvedorIaError } from "./errors";
import {
  converterErroProvedor,
  lerCorpoProvedorLimitado,
  sinalTimeoutProvedor,
  validarRespostaTexto,
} from "./providerRuntime";

const MODELO = process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODELO)}:generateContent`;

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new ProvedorIaError("provedor_indisponivel");
  return key;
}

async function chamarGemini(params: {
  systemPrompt: string;
  contents: { role: "user" | "model"; parts: GeminiPart[] }[];
  maxOutputTokens: number;
}): Promise<string> {
  const signal = sinalTimeoutProvedor();
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": getApiKey(),
      },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: params.systemPrompt }] },
        contents: params.contents,
        generationConfig: {
          maxOutputTokens: params.maxOutputTokens,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
  } catch (erro) {
    throw converterErroProvedor(erro, signal);
  }

  if (!res.ok) {
    await res.body?.cancel().catch(() => undefined);
    throw new ProvedorIaError("falha_provedor");
  }

  let data: GeminiResponse;
  try {
    data = JSON.parse(await lerCorpoProvedorLimitado(res)) as GeminiResponse;
  } catch (erro) {
    throw converterErroProvedor(erro);
  }
  return (data.candidates?.[0]?.content?.parts ?? [])
    .map((parte) => (typeof parte.text === "string" ? parte.text : ""))
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
    historico.map((turno) => ({
      role: turno.autor === "usuario" ? "user" : "model",
      parts: [{ text: turno.texto }],
    }));
  const partesAtuais: GeminiPart[] = [];
  if (imagem) {
    partesAtuais.push({
      inlineData: { mimeType: imagem.mediaType, data: imagem.base64 },
    });
  }
  if (texto) partesAtuais.push({ text: texto });
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
  return validarRespostaTexto(
    await chamarGemini({
      systemPrompt: params.systemPrompt,
      contents: [{ role: "user", parts: [{ text: params.pergunta }] }],
      maxOutputTokens: 300,
    }),
  );
}
