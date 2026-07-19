// Constantes/tipos do seletor de provedor de IA. SEM imports de servidor —
// este módulo é compartilhado entre componentes de UI e código de API.

export type AiProvider = "gemini" | "groq" | "anthropic";

// Gemini é o padrão por enquanto: é a API gratuita ativa. Claude fica
// disponível no seletor para quando houver ANTHROPIC_API_KEY configurada.
export const PROVEDOR_PADRAO: AiProvider = "gemini";

export const PROVEDORES_IA: { valor: AiProvider; label: string }[] = [
  { valor: "gemini", label: "Gemini" },
  { valor: "groq", label: "Llama 3.3" },
  { valor: "anthropic", label: "Claude" },
];

export function ehProvedorValido(valor: unknown): valor is AiProvider {
  return PROVEDORES_IA.some((p) => p.valor === valor);
}
