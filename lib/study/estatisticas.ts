import { prisma } from "@/lib/prisma";

// Estatísticas da aba Estudos: tempo por matéria na semana + streak de dias
// seguidos estudando. Puro servidor, sem acoplamento com UI.

function diaISO(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

export interface ResumoEstudos {
  porMateria: { materia: string; minutos: number }[];
  streakDias: number;
  diasEstudadosSemana: string[];
  totalMinutosSemana: number;
}

export async function calcularResumoEstudos(
  userId: string,
): Promise<ResumoEstudos> {
  const desde = new Date();
  desde.setDate(desde.getDate() - 90); // histórico suficiente para o streak

  const entradas = await prisma.entry.findMany({
    where: { userId, tipo: "estudo", createdAt: { gte: desde } },
    select: { dados: true, categoria: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 6);
  const seteDiasISO = diaISO(seteDiasAtras);

  const diasComEstudo = new Set<string>();
  const minutosPorMateria = new Map<string, number>();
  let totalMinutosSemana = 0;

  for (const e of entradas) {
    const dados = (e.dados ?? {}) as Record<string, unknown>;
    const materia =
      (typeof dados.materia === "string" && dados.materia.trim()) ||
      e.categoria ||
      "Geral";
    const minutos = Number(dados.duracaoMinutos) || 0;
    const dia = diaISO(e.createdAt);

    diasComEstudo.add(dia);

    if (dia >= seteDiasISO) {
      minutosPorMateria.set(
        materia,
        (minutosPorMateria.get(materia) ?? 0) + minutos,
      );
      totalMinutosSemana += minutos;
    }
  }

  // Streak: dias consecutivos até hoje (com folga de 1 dia — se ainda não
  // estudou hoje, a sequência não quebra até o fim do dia).
  let streak = 0;
  const hojeISO = diaISO(new Date());
  const cursor = new Date();
  if (!diasComEstudo.has(hojeISO)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  for (let i = 0; i < 365; i++) {
    const iso = diaISO(cursor);
    if (!diasComEstudo.has(iso)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const porMateria = Array.from(minutosPorMateria.entries())
    .map(([materia, minutos]) => ({ materia, minutos }))
    .sort((a, b) => b.minutos - a.minutos);

  const diasEstudadosSemana = Array.from(diasComEstudo).filter(
    (d) => d >= seteDiasISO,
  );

  return { porMateria, streakDias: streak, diasEstudadosSemana, totalMinutosSemana };
}
