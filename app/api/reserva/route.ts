import {
  buscarPlanoAtual,
  calcularMediaFinanceira,
  calcularPrazoMeses,
  mesesAteData,
  MESES_RESERVA_EMERGENCIA,
  salvarPlano,
  sugerirMetaEmergencia,
  sugerirValorMensal,
  valorGuardadoDoPlano,
  valorMensalPorPrazo,
  type PlanoReservaDados,
} from "@/lib/finance/reserva";
import { calcularResumo } from "@/lib/finance/resumo";
import { ApiError, okJson, secureRoute } from "@/lib/security/errors";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import {
  assertOnlyKeys,
  parseJsonObject,
} from "@/lib/security/request";
import { requireCurrentUser } from "@/lib/security/session";
import {
  parseEnum,
  parseMoney,
  parseReferenceMonth,
  parseRequiredText,
} from "@/lib/security/validation";

const MODOS = ["manual", "sugestao", "prazo"] as const;
const MAX_BODY_BYTES = 8 * 1024;

export async function GET() {
  return secureRoute("reserva:get", async () => {
    const user = await requireCurrentUser(RATE_LIMITS.dataRead);
    const [media, planoAtual, resumo] = await Promise.all([
      calcularMediaFinanceira(user.id),
      buscarPlanoAtual(user.id),
      calcularResumo(user.id),
    ]);

    return okJson({
      media,
      resumo,
      sugestaoValorMensal: sugerirValorMensal(media),
      sugestaoMetaEmergencia: sugerirMetaEmergencia(media),
      mesesReservaEmergencia: MESES_RESERVA_EMERGENCIA,
      plano: planoAtual,
    });
  });
}

export async function POST(req: Request) {
  return secureRoute("reserva:save", async () => {
    const user = await requireCurrentUser(RATE_LIMITS.dataWrite);
    const body = await parseJsonObject(req, MAX_BODY_BYTES);
    assertOnlyKeys(body, [
      "objetivo",
      "metaValor",
      "modo",
      "valorManual",
      "valorGuardado",
      "dataAlvo",
    ]);

    const objetivo = parseRequiredText(body.objetivo, {
      label: "Objetivo",
      max: 160,
    });
    const modo = parseEnum(body.modo, MODOS, "Modo");
    const metaInformada =
      body.metaValor === null || body.metaValor === undefined
        ? null
        : parseMoney(body.metaValor);
    const valorGuardado =
      body.valorGuardado === undefined
        ? undefined
        : parseMoney(body.valorGuardado);
    const valorManual =
      body.valorManual === undefined ? undefined : parseMoney(body.valorManual);
    const dataAlvo =
      body.dataAlvo === undefined
        ? undefined
        : parseReferenceMonth(body.dataAlvo);

    const [media, planoAnterior] = await Promise.all([
      calcularMediaFinanceira(user.id),
      valorGuardado === undefined ? buscarPlanoAtual(user.id) : Promise.resolve(null),
    ]);
    const meta =
      metaInformada && metaInformada > 0
        ? metaInformada
        : sugerirMetaEmergencia(media) || null;
    const guardado =
      valorGuardado ?? valorGuardadoDoPlano(planoAnterior?.dados);

    let valorMensal: number;
    let dataAlvoSalva: string | null = null;
    let prazoMeses: number | null;

    if (modo === "manual") {
      if (!valorManual || valorManual <= 0) {
        throw new ApiError(
          400,
          "INVALID_MONTHLY_AMOUNT",
          "Informe um valor mensal válido.",
        );
      }
      valorMensal = valorManual;
      prazoMeses = meta
        ? calcularPrazoMeses(meta, valorMensal, guardado)
        : null;
    } else if (modo === "prazo") {
      if (!meta || !dataAlvo) {
        throw new ApiError(
          400,
          "INVALID_TARGET",
          "Defina uma meta e um mês futuro.",
        );
      }
      const meses = mesesAteData(dataAlvo);
      if (!meses) {
        throw new ApiError(
          400,
          "INVALID_TARGET_DATE",
          "Escolha um mês-alvo no futuro.",
        );
      }
      valorMensal = valorMensalPorPrazo(meta, meses, guardado);
      prazoMeses = meses;
      dataAlvoSalva = dataAlvo;
    } else {
      valorMensal = sugerirValorMensal(media);
      prazoMeses = meta
        ? calcularPrazoMeses(meta, valorMensal, guardado)
        : null;
    }

    const plano: PlanoReservaDados = {
      objetivo,
      metaValor: meta,
      valorMensal,
      valorGuardado,
      prazoMeses,
      dataAlvo: dataAlvoSalva,
      modo,
    };
    const salvo = await salvarPlano(user.id, plano);
    return okJson({ plano: salvo, media });
  });
}
