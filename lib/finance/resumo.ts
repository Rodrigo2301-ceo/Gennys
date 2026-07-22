import { prisma } from "@/lib/prisma";
import { calcularResumoDeEntradas } from "./calculos";

// Resumo "como estou hoje". createdAt permanece apenas como timestamp de
// auditoria; transactionDate/referenceMonth definem a competencia financeira.
export interface ResumoFinanceiro {
  saldoAcumulado: number;
  // Alias temporario para clientes antigos durante o deploy aditivo.
  patrimonio: number;
  receitaMes: number;
  despesaMes: number;
  saldoMes: number;
}

export async function calcularResumo(
  userId: string,
  agora = new Date(),
): Promise<ResumoFinanceiro> {
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

  return calcularResumoDeEntradas(entradas, agora);
}
