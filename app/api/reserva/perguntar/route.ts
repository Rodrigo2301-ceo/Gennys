import { exigirConsentimentoIaVigente } from "@/lib/ai/consent";
import { provedorEstaDisponivel } from "@/lib/ai/availability";
import { obterProvedorIA } from "@/lib/ai/preference";
import { consumirCotaDiariaIA } from "@/lib/ai/usage";
import { ProvedorIaError } from "@/lib/engine/errors";
import { calcularMediaFinanceira } from "@/lib/finance/reserva";
import { responderPerguntaReserva } from "@/lib/finance/assistente";
import {
  ApiError,
  errorJson,
  okJson,
} from "@/lib/security/errors";
import { parseJsonObject, assertOnlyKeys } from "@/lib/security/request";
import { requireCurrentUser } from "@/lib/security/session";
import { parseRequiredText } from "@/lib/security/validation";
import { responderErroProcessamento } from "@/app/api/process/responses";

const MAX_BODY_BYTES = 4 * 1024;
const LIMITE_ASSISTENTE = {
  action: "ai:reserva",
  limit: 10,
  windowMs: 60_000,
} as const;

const TERMOS_INVESTIMENTO =
  /\b(investir|investimento|a[cç][aã]o|a[cç][oõ]es|cdb|fundo|cripto|corretora|aplica[cç][aã]o)\b/i;
const TERMOS_CALCULO =
  /\b(quanto|guardar|economizar|reserva|meta|prazo|por m[eê]s)\b/i;

function respostaLocal(
  pergunta: string,
  media: { receitaMedia: number; despesaMedia: number },
): string | null {
  if (TERMOS_INVESTIMENTO.test(pergunta)) {
    return "Não indico produtos de investimento ou corretoras. Para escolher onde aplicar, procure um profissional certificado; aqui posso ajudar a calcular quanto guardar por mês.";
  }
  if (!TERMOS_CALCULO.test(pergunta)) return null;
  const sobra = Math.max(0, media.receitaMedia - media.despesaMedia);
  const sugestao = Math.round((sobra * 0.2) / 10) * 10;
  if (sugestao <= 0) {
    return "Com os registros atuais, ainda não há sobra mensal positiva para estimar uma reserva. Revise ou complete receitas e despesas, ou defina manualmente um valor que caiba no seu mês.";
  }
  return `Pelos seus registros, uma referência conservadora é guardar ${sugestao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por mês, equivalente a 20% da sobra média. Ajuste se isso apertar seu orçamento.`;
}

export async function POST(req: Request) {
  try {
    const user = await requireCurrentUser(LIMITE_ASSISTENTE);
    const body = await parseJsonObject(req, MAX_BODY_BYTES);
    assertOnlyKeys(body, ["pergunta"]);
    const pergunta = parseRequiredText(body.pergunta, {
      label: "Pergunta",
      max: 600,
    });
    const media = await calcularMediaFinanceira(user.id);

    const local = respostaLocal(pergunta, media);
    if (local) return okJson({ resposta: local, processamento: "local" });

    const provider = await obterProvedorIA(user.id);
    if (!provedorEstaDisponivel(provider)) {
      throw new ProvedorIaError("provedor_indisponivel");
    }
    await exigirConsentimentoIaVigente(user.id, provider);
    await consumirCotaDiariaIA(user.id);
    const resposta = await responderPerguntaReserva(pergunta, media, provider);
    return okJson({ resposta, processamento: "ia" });
  } catch (error) {
    if (error instanceof ApiError) return errorJson(error);
    return responderErroProcessamento(error);
  }
}
