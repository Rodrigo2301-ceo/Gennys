import { prisma } from "@/lib/prisma";

// Medição de uso da IA por usuário/dia. Preparado para o limite do plano grátis,
// mas NÃO bloqueia ninguém nesta fase — só conta.

function diaHojeSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // YYYY-MM-DD
}

// Incrementa e devolve o total de chamadas de IA do usuário hoje.
// Nunca deixa a medição derrubar o fluxo principal (best-effort).
export async function registrarInteracaoIA(userId: string): Promise<number> {
  const dia = diaHojeSaoPaulo();
  try {
    const registro = await prisma.iaUsage.upsert({
      where: { userId_dia: { userId, dia } },
      create: { userId, dia, chamadas: 1 },
      update: { chamadas: { increment: 1 } },
      select: { chamadas: true },
    });
    return registro.chamadas;
  } catch (err) {
    console.error("[ia-usage] falha ao contar interação:", err);
    return 0;
  }
}

// Leitura do uso de hoje (para futuros avisos/limite — ainda não usado para bloquear).
export async function usoDeHoje(userId: string): Promise<number> {
  const dia = diaHojeSaoPaulo();
  const registro = await prisma.iaUsage.findUnique({
    where: { userId_dia: { userId, dia } },
    select: { chamadas: true },
  });
  return registro?.chamadas ?? 0;
}
