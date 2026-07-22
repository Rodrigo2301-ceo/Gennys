import { prisma } from "@/lib/prisma";
import { CATEGORIA_PLANO } from "./reserva";

// Resumo "como estou hoje", derivado só das transações que o usuário registrou.
// - patrimonio: acumulado de todos os tempos (receitas - despesas).
// - {receita,despesa,saldo}Mes: totais do mês atual (America/Sao_Paulo).
// Ignora o registro do plano de reserva (não é transação).

export interface ResumoFinanceiro {
  patrimonio: number;
  receitaMes: number;
  despesaMes: number;
  saldoMes: number;
}

function mesAtualSP(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date()); // "YYYY-MM"
}

export async function calcularResumo(userId: string): Promise<ResumoFinanceiro> {
  const entradas = await prisma.entry.findMany({
    where: { userId, tipo: "financa", categoria: { not: CATEGORIA_PLANO } },
    select: { valor: true, dados: true, createdAt: true },
  });

  const mesAtual = mesAtualSP();
  let patrimonio = 0;
  let receitaMes = 0;
  let despesaMes = 0;

  for (const e of entradas) {
    const v = e.valor ? Number(e.valor) : 0;
    const dados = (e.dados ?? {}) as Record<string, unknown>;
    const ehReceita = dados.movimento === "receita";
    patrimonio += ehReceita ? v : -v;

    const mes = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
    }).format(e.createdAt);
    if (mes === mesAtual) {
      if (ehReceita) receitaMes += v;
      else despesaMes += v;
    }
  }

  return {
    patrimonio,
    receitaMes,
    despesaMes,
    saldoMes: receitaMes - despesaMes,
  };
}
