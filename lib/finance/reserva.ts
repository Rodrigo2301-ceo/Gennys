import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";

// Plano de reserva: NUNCA recomenda produto de investimento (CLAUDE.md).
// Aqui só calculamos quanto guardar por mês e o tempo até a meta, com base
// nas receitas e gastos que o próprio usuário já registrou.

const CATEGORIA_PLANO = "plano_reserva";

export interface MediaFinanceira {
  receitaMedia: number;
  despesaMedia: number;
  mesesConsiderados: number;
}

// Média de receitas/despesas dos últimos 3 meses com dados registrados
// (ignora o próprio registro do plano de reserva).
export async function calcularMediaFinanceira(
  userId: string,
): Promise<MediaFinanceira> {
  const desde = new Date();
  desde.setDate(desde.getDate() - 90);

  const entradas = await prisma.entry.findMany({
    where: {
      userId,
      tipo: "financa",
      categoria: { not: CATEGORIA_PLANO },
      createdAt: { gte: desde },
    },
    select: { valor: true, dados: true, createdAt: true },
  });

  if (entradas.length === 0) {
    return { receitaMedia: 0, despesaMedia: 0, mesesConsiderados: 0 };
  }

  let receita = 0;
  let despesa = 0;
  const meses = new Set<string>();

  for (const e of entradas) {
    const v = e.valor ? Number(e.valor) : 0;
    const dados = (e.dados ?? {}) as Record<string, unknown>;
    const movimento = dados.movimento === "receita" ? "receita" : "despesa";
    if (movimento === "receita") receita += v;
    else despesa += v;
    meses.add(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
      }).format(e.createdAt),
    );
  }

  const divisor = Math.max(1, meses.size);
  return {
    receitaMedia: receita / divisor,
    despesaMedia: despesa / divisor,
    mesesConsiderados: meses.size,
  };
}

// Sugestão conservadora: guarda 20% do que sobra entre receita e despesa.
export function sugerirValorMensal(media: MediaFinanceira): number {
  const sobra = media.receitaMedia - media.despesaMedia;
  if (sobra <= 0) return 0;
  return Math.round((sobra * 0.2) / 10) * 10;
}

// Reserva de emergência = N meses das despesas do usuário. 6 é o padrão mais
// aceito no Brasil (CLT); serve de racional explícito na tela.
export const MESES_RESERVA_EMERGENCIA = 6;

// Meta padrão de reserva de emergência: N x a despesa média mensal.
export function sugerirMetaEmergencia(media: MediaFinanceira): number {
  if (media.despesaMedia <= 0) return 0;
  return (
    Math.round((media.despesaMedia * MESES_RESERVA_EMERGENCIA) / 50) * 50
  );
}

export function calcularPrazoMeses(
  metaValor: number,
  valorMensal: number,
): number | null {
  if (!metaValor || !valorMensal || valorMensal <= 0) return null;
  return Math.ceil(metaValor / valorMensal);
}

// Meses inteiros (arredondado pra cima) entre hoje e uma data-alvo "YYYY-MM"
// ou "YYYY-MM-DD". Retorna null se a data for inválida ou já passou.
export function mesesAteData(dataAlvo: string): number | null {
  const partes = dataAlvo.split("-").map(Number);
  const [ano, mes] = partes;
  if (!ano || !mes) return null;
  const hoje = new Date();
  const meses = (ano - hoje.getFullYear()) * 12 + (mes - 1 - hoje.getMonth());
  return meses > 0 ? meses : null;
}

// Valor mensal derivado de uma meta com prazo: meta ÷ meses restantes.
export function valorMensalPorPrazo(
  metaValor: number,
  mesesRestantes: number,
): number {
  if (!metaValor || mesesRestantes <= 0) return 0;
  return Math.ceil(metaValor / mesesRestantes / 10) * 10;
}

export interface PlanoReservaDados {
  objetivo: string;
  metaValor: number | null;
  valorMensal: number;
  prazoMeses: number | null;
  dataAlvo: string | null; // "YYYY-MM" quando o modo é "prazo"
  modo: "manual" | "sugestao" | "prazo";
}

export async function buscarPlanoAtual(userId: string) {
  return prisma.entry.findFirst({
    where: { userId, tipo: "financa", categoria: CATEGORIA_PLANO },
    orderBy: { createdAt: "desc" },
  });
}

export async function salvarPlano(userId: string, plano: PlanoReservaDados) {
  return prisma.entry.create({
    data: {
      userId,
      tipo: "financa",
      categoria: CATEGORIA_PLANO,
      valor: null,
      dados: plano as unknown as Prisma.InputJsonValue,
    },
  });
}

export { CATEGORIA_PLANO };
