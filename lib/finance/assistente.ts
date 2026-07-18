import Anthropic from "@anthropic-ai/sdk";
import type { MediaFinanceira } from "./reserva";

const MODELO = "claude-sonnet-4-6";

let cliente: Anthropic | null = null;
function getCliente(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY não configurada no ambiente.");
  }
  if (!cliente) cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return cliente;
}

// Assistente de planejamento de reserva. Mesma regra do CLAUDE.md: NUNCA
// recomenda produto de investimento; se perguntarem, recusa e sugere
// profissional certificado. Planejar quanto guardar por mês é permitido.
function systemPromptReserva(media: MediaFinanceira): string {
  return `Você é o Gennys ajudando o usuário a planejar uma reserva financeira
ou meta de economia. Responda curto, natural, em português brasileiro, tom jovem.

Dados financeiros médios do usuário (últimos meses registrados):
- Receita média mensal: R$ ${media.receitaMedia.toFixed(2)}
- Despesa média mensal: R$ ${media.despesaMedia.toFixed(2)}

REGRA ABSOLUTA: você NUNCA recomenda produtos de investimento (ações, CDB,
fundos, cripto, corretoras, "onde investir"). Se perguntarem isso, recuse
educadamente e sugira procurar um profissional certificado (planejador
financeiro/CVM). Planejar QUANTO guardar por mês é permitido e é seu papel
aqui — só não diga ONDE aplicar esse dinheiro.

Responda apenas com texto corrido curto (1-3 frases), sem JSON, sem markdown.`;
}

export async function responderPerguntaReserva(
  pergunta: string,
  media: MediaFinanceira,
): Promise<string> {
  const resposta = await getCliente().messages.create({
    model: MODELO,
    max_tokens: 300,
    system: systemPromptReserva(media),
    messages: [{ role: "user", content: pergunta }],
  });

  return resposta.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}
