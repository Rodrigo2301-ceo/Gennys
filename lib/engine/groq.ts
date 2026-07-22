import type { Categorizacao, ImagemEntrada, TurnoHistorico } from "./types";
import { extrairJSON, normalizarCategorizacao } from "./parseCategorizacao";
import { ProvedorIaError } from "./errors";
import {
  converterErroProvedor,
  lerCorpoProvedorLimitado,
  sinalTimeoutProvedor,
  validarRespostaTexto,
} from "./providerRuntime";

const MODELO = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface GroqResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

function getApiKey(): string {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) throw new ProvedorIaError("provedor_indisponivel");
  return key;
}

async function chamarGroq(params: {
  messages: GroqMessage[];
  maxTokens: number;
}): Promise<string> {
  const signal = sinalTimeoutProvedor();
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      signal,
      body: JSON.stringify({
        model: MODELO,
        messages: params.messages,
        max_tokens: params.maxTokens,
      }),
    });
  } catch (erro) {
    throw converterErroProvedor(erro, signal);
  }

  if (!res.ok) {
    await res.body?.cancel().catch(() => undefined);
    throw new ProvedorIaError("falha_provedor");
  }

  let data: GroqResponse;
  try {
    data = JSON.parse(await lerCorpoProvedorLimitado(res)) as GroqResponse;
  } catch (erro) {
    throw converterErroProvedor(erro);
  }
  const texto = data.choices?.[0]?.message?.content;
  return typeof texto === "string" ? texto.trim() : "";
}

export async function categorizar(params: {
  systemPrompt: string;
  historico?: TurnoHistorico[];
  texto?: string;
  imagem?: ImagemEntrada;
}): Promise<Categorizacao> {
  const { systemPrompt, historico = [], texto, imagem } = params;
  if (imagem) throw new ProvedorIaError("provedor_incompativel");

  const messages: GroqMessage[] = [{ role: "system", content: systemPrompt }];
  for (const turno of historico) {
    messages.push({
      role: turno.autor === "usuario" ? "user" : "assistant",
      content: turno.texto,
    });
  }
  messages.push({ role: "user", content: texto ?? "" });
  const textoResposta = await chamarGroq({ messages, maxTokens: 1024 });
  return normalizarCategorizacao(extrairJSON(textoResposta));
}

export async function responderTexto(params: {
  systemPrompt: string;
  pergunta: string;
}): Promise<string> {
  return validarRespostaTexto(
    await chamarGroq({
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.pergunta },
      ],
      maxTokens: 300,
    }),
  );
}
