// Dispatcher de provedor de IA (SERVIDOR APENAS — importa os SDKs/clientes).
// O "cérebro" do Gennys pode rodar em cima de Gemini, Grok ou Claude — o
// usuário escolhe (User.aiProvider) e todo o resto do app (motor de entrada,
// assistente financeiro) chama daqui, sem saber qual provedor está por trás.
// Constantes/tipos compartilhados com a UI vivem em lib/ai/providers.ts.

import type { Categorizacao, ImagemEntrada, TurnoHistorico } from "./types";
import type { AiProvider } from "@/lib/ai/providers";
import * as anthropic from "./anthropic";
import * as gemini from "./gemini";
import * as groq from "./groq";

const IMPLEMENTACOES = { anthropic, gemini, groq };

export async function categorizarComProvedor(
  provider: AiProvider,
  params: {
    systemPrompt: string;
    historico?: TurnoHistorico[];
    texto?: string;
    imagem?: ImagemEntrada;
  },
): Promise<Categorizacao> {
  return IMPLEMENTACOES[provider].categorizar(params);
}

export async function responderTextoComProvedor(
  provider: AiProvider,
  params: { systemPrompt: string; pergunta: string },
): Promise<string> {
  return IMPLEMENTACOES[provider].responderTexto(params);
}
