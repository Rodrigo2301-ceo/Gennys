import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import {
  calcularMediaDeEntradas,
  CATEGORIA_PLANO_RESERVA,
} from "./calculos";
import {
  mesesAteMesCivil,
  parseDataCivil,
  parseMesCivil,
} from "./datas";

const CATEGORIA_PLANO = CATEGORIA_PLANO_RESERVA;

export interface MediaFinanceira {
  receitaMedia: number;
  despesaMedia: number;
  mesesConsiderados: number;
}

// Media dos tres meses de referencia mais recentes com dados. Entradas
// retroativas e ocorrencias materializadas usam a competencia financeira, nao
// o instante em que foram gravadas.
export async function calcularMediaFinanceira(
  userId: string,
  agora = new Date(),
): Promise<MediaFinanceira> {
  const entradas = await prisma.entry.findMany({
    where: { userId, tipo: "financa" },
    select: {
      id: true,
      valor: true,
      dados: true,
      categoria: true,
      createdAt: true,
      transactionDate: true,
      referenceMonth: true,
      mesReferencia: true,
      origemRecorrenteId: true,
      recurrenceKey: true,
      excludeFromTotals: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return calcularMediaDeEntradas(entradas, agora);
}

// Sugestao conservadora: guarda 20% do que sobra entre receita e despesa.
export function sugerirValorMensal(media: MediaFinanceira): number {
  const sobra = media.receitaMedia - media.despesaMedia;
  if (sobra <= 0) return 0;
  return Math.round((sobra * 0.2) / 10) * 10;
}

export const MESES_RESERVA_EMERGENCIA = 6;

export function sugerirMetaEmergencia(media: MediaFinanceira): number {
  if (media.despesaMedia <= 0) return 0;
  return (
    Math.round((media.despesaMedia * MESES_RESERVA_EMERGENCIA) / 50) * 50
  );
}

export function calcularPrazoMeses(
  metaValor: number,
  valorMensal: number,
  valorGuardado = 0,
): number | null {
  const restante = Math.max(0, metaValor - Math.max(0, valorGuardado));
  if (!metaValor || !valorMensal || valorMensal <= 0) return null;
  return Math.ceil(restante / valorMensal);
}

// Aceita apenas mes civil "YYYY-MM" ou data civil estrita "YYYY-MM-DD".
export function mesesAteData(
  dataAlvo: string,
  agora = new Date(),
): number | null {
  const mes = parseMesCivil(dataAlvo)
    ? dataAlvo
    : parseDataCivil(dataAlvo)
      ? dataAlvo.slice(0, 7)
      : null;
  return mes ? mesesAteMesCivil(mes, agora) : null;
}

export function valorMensalPorPrazo(
  metaValor: number,
  mesesRestantes: number,
  valorGuardado = 0,
): number {
  const restante = Math.max(0, metaValor - Math.max(0, valorGuardado));
  if (!metaValor || mesesRestantes <= 0) return 0;
  return Math.ceil(restante / mesesRestantes / 10) * 10;
}

export interface PlanoReservaDados {
  objetivo: string;
  metaValor: number | null;
  valorMensal: number;
  prazoMeses: number | null;
  dataAlvo: string | null;
  modo: "manual" | "sugestao" | "prazo";
  // Nunca e inferido de receitas menos despesas: deve vir do usuario.
  valorGuardado?: number;
}

function objetoJson(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

export function valorGuardadoDoPlano(dados: unknown): number {
  const valor = Number(objetoJson(dados).valorGuardado);
  return Number.isFinite(valor) && valor > 0 ? valor : 0;
}

function planoNormalizado(
  plano: PlanoReservaDados,
  valorGuardadoAnterior = 0,
): PlanoReservaDados & { valorGuardado: number } {
  const informado = Number(plano.valorGuardado);
  const valorGuardado =
    plano.valorGuardado !== undefined && Number.isFinite(informado)
      ? Math.max(0, informado)
      : Math.max(0, valorGuardadoAnterior);
  let valorMensal = plano.valorMensal;
  if (plano.modo === "prazo" && plano.metaValor && plano.dataAlvo) {
    const meses = mesesAteData(plano.dataAlvo);
    if (meses) {
      valorMensal = valorMensalPorPrazo(
        plano.metaValor,
        meses,
        valorGuardado,
      );
    }
  }
  const prazoMeses = plano.metaValor
    ? calcularPrazoMeses(plano.metaValor, valorMensal, valorGuardado)
    : plano.prazoMeses;
  return { ...plano, valorMensal, prazoMeses, valorGuardado };
}

export async function buscarPlanoAtual(userId: string) {
  const atual = await prisma.reservationPlan.findUnique({ where: { userId } });
  if (atual) {
    const dados = objetoJson(atual.dados);
    return {
      ...atual,
      dados: { ...dados, valorGuardado: valorGuardadoDoPlano(dados) },
    };
  }

  // Fallback somente de leitura para o intervalo entre migration e backfill.
  const legado = await prisma.entry.findFirst({
    where: { userId, tipo: "financa", categoria: CATEGORIA_PLANO },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  if (!legado) return null;
  const dados = objetoJson(legado.dados);
  return {
    id: `legacy:${legado.id}`,
    userId,
    dados: { ...dados, valorGuardado: valorGuardadoDoPlano(dados) },
    createdAt: legado.createdAt,
    updatedAt: legado.createdAt,
  };
}

export async function salvarPlano(userId: string, plano: PlanoReservaDados) {
  const anterior = await buscarPlanoAtual(userId);
  const normalizado = planoNormalizado(
    plano,
    valorGuardadoDoPlano(anterior?.dados),
  );
  const dados = normalizado as unknown as Prisma.InputJsonValue;

  return prisma.reservationPlan.upsert({
    where: { userId },
    create: { userId, dados },
    update: { dados },
  });
}

export { CATEGORIA_PLANO };
