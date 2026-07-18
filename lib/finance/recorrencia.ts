import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";

// Finança travada = despesa fixa: repete automaticamente todo mês.
// Verificação feita no load da aba Financeiro (sem job/cron nesta fase).

function mesISO(d: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  });
  const partes = fmt.formatToParts(d);
  const ano = partes.find((p) => p.type === "year")?.value;
  const mes = partes.find((p) => p.type === "month")?.value;
  return `${ano}-${mes}`;
}

function proximoMes(mesISOAtual: string): string {
  const [ano, mes] = mesISOAtual.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1 + 1, 1));
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Gera as cópias mensais que faltarem para cada finança travada (template)
// do usuário, até o mês atual. Idempotente: nunca duplica um mês já gerado.
export async function gerarRepeticoesFinanceiras(userId: string): Promise<void> {
  const hoje = mesISO(new Date());

  const templates = await prisma.entry.findMany({
    where: {
      userId,
      tipo: "financa",
      locked: true,
      origemRecorrenteId: null,
    },
    include: {
      geradas: { select: { mesReferencia: true } },
    },
  });

  for (const t of templates) {
    const mesOrigem = mesISO(t.createdAt);
    const mesesGerados = new Set(
      t.geradas.map((g) => g.mesReferencia).filter(Boolean) as string[],
    );
    mesesGerados.add(mesOrigem); // o próprio template cobre seu mês de criação

    let cursor = mesOrigem;
    const novas: Prisma.EntryCreateManyInput[] = [];

    // Limite de segurança para nunca rodar um loop indefinido.
    for (let i = 0; i < 240; i++) {
      cursor = proximoMes(cursor);
      if (cursor > hoje) break;
      if (mesesGerados.has(cursor)) continue;

      novas.push({
        userId,
        tipo: "financa",
        dados: t.dados as Prisma.InputJsonValue,
        valor: t.valor,
        categoria: t.categoria,
        locked: false,
        origemRecorrenteId: t.id,
        mesReferencia: cursor,
      });
    }

    if (novas.length > 0) {
      await prisma.entry.createMany({ data: novas });
    }
  }
}
