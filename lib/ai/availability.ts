import {
  PROVEDORES_IA,
  type AiProvider,
  type AiProviderPublico,
} from "./providers";

export interface AiProviderDisponivel extends AiProviderPublico {
  disponivel: boolean;
}

function possuiConfiguracao(provider: AiProvider): boolean {
  switch (provider) {
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
    case "gemini":
      return Boolean(process.env.GEMINI_API_KEY?.trim());
    case "groq":
      return Boolean(process.env.GROQ_API_KEY?.trim());
  }
}

export function provedorEstaDisponivel(provider: AiProvider): boolean {
  return possuiConfiguracao(provider);
}

export function provedorAceitaImagem(provider: AiProvider): boolean {
  return PROVEDORES_IA.find((item) => item.valor === provider)?.aceitaImagem ?? false;
}

export function listarProvedoresDisponiveis(): AiProviderDisponivel[] {
  return PROVEDORES_IA.map((provider) => ({
    ...provider,
    disponivel: provedorEstaDisponivel(provider.valor),
  }));
}
