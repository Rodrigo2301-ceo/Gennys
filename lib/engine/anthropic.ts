import Anthropic from "@anthropic-ai/sdk";
import type { Categorizacao, ImagemEntrada, TurnoHistorico } from "./types";
import { extrairJSON, normalizarCategorizacao } from "./parseCategorizacao";
import { ProvedorIaError } from "./errors";
import {
  converterErroProvedor,
  sinalTimeoutProvedor,
  validarRespostaTexto,
} from "./providerRuntime";

const MODELO = "claude-sonnet-4-6";
let cliente: Anthropic | null = null;

function getCliente(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new ProvedorIaError("provedor_indisponivel");
  if (!cliente) cliente = new Anthropic({ apiKey });
  return cliente;
}

async function criarMensagem(
  body: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  const signal = sinalTimeoutProvedor();
  try {
    return await getCliente().messages.create(body, { signal });
  } catch (erro) {
    throw converterErroProvedor(erro, signal);
  }
}

export async function categorizar(params: {
  systemPrompt: string;
  historico?: TurnoHistorico[];
  texto?: string;
  imagem?: ImagemEntrada;
}): Promise<Categorizacao> {
  const { systemPrompt, historico = [], texto, imagem } = params;
  const messages: Anthropic.MessageParam[] = historico.map((turno) => ({
    role: turno.autor === "usuario" ? "user" : "assistant",
    content: turno.texto,
  }));

  const conteudoAtual: Anthropic.ContentBlockParam[] = [];
  if (imagem) {
    conteudoAtual.push({
      type: "image",
      source: {
        type: "base64",
        media_type: imagem.mediaType,
        data: imagem.base64,
      },
    });
  }
  if (texto) conteudoAtual.push({ type: "text", text: texto });
  messages.push({ role: "user", content: conteudoAtual });

  const resposta = await criarMensagem({
    model: MODELO,
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });
  const textoResposta = resposta.content
    .filter((bloco): bloco is Anthropic.TextBlock => bloco.type === "text")
    .map((bloco) => bloco.text)
    .join("");
  return normalizarCategorizacao(extrairJSON(textoResposta));
}

export async function responderTexto(params: {
  systemPrompt: string;
  pergunta: string;
}): Promise<string> {
  const resposta = await criarMensagem({
    model: MODELO,
    max_tokens: 300,
    system: params.systemPrompt,
    messages: [{ role: "user", content: params.pergunta }],
  });
  return validarRespostaTexto(
    resposta.content
      .filter((bloco): bloco is Anthropic.TextBlock => bloco.type === "text")
      .map((bloco) => bloco.text)
      .join(""),
  );
}
