import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { planejarOcorrencias } from "./recorrenciaCore";

// Materializacao lazy, mantida por compatibilidade com o fluxo atual. A leitura
// e todas as escritas ficam na mesma transacao; recurrenceKey + skipDuplicates
// tornam requisicoes simultaneas idempotentes no PostgreSQL.
export async function gerarRepeticoesFinanceiras(
  userId: string,
  agora = new Date(),
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const templates = await tx.entry.findMany({
      where: {
        userId,
        tipo: "financa",
        recurring: true,
        origemRecorrenteId: null,
      },
      select: {
        id: true,
        userId: true,
        dados: true,
        valor: true,
        categoria: true,
        createdAt: true,
        transactionDate: true,
        referenceMonth: true,
        mesReferencia: true,
      },
    });

    const novas = templates.flatMap((template) =>
      planejarOcorrencias(template, agora).map((ocorrencia) => ({
        ...ocorrencia,
        dados: ocorrencia.dados as Prisma.InputJsonValue,
        valor: ocorrencia.valor as Prisma.Decimal | null,
      })),
    ) satisfies Prisma.EntryCreateManyInput[];

    if (novas.length > 0) {
      await tx.entry.createMany({ data: novas, skipDuplicates: true });
    }
  });
}
