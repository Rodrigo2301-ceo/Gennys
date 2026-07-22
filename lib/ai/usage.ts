import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const LIMITE_DIARIO_IA_GRATUITO = 30;
export const LIMITE_DIARIO_IA_DEMAIS_PLANOS = 300;

export interface ConsumoCotaIa {
  dia: string;
  usado: number;
  limite: number;
}

export class CotaIaExcedidaError extends Error {
  constructor(
    public readonly limite: number,
    public readonly retryAfterSeconds: number,
  ) {
    super("Cota diaria de IA atingida.");
    this.name = "CotaIaExcedidaError";
  }
}

function partesAgoraSaoPaulo(agora = new Date()): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(agora)
      .filter((parte) => parte.type !== "literal")
      .map((parte) => [parte.type, parte.value]),
  );
}

export function diaHojeSaoPaulo(agora = new Date()): string {
  const partes = partesAgoraSaoPaulo(agora);
  return `${partes.year}-${partes.month}-${partes.day}`;
}

function segundosAteProximoDiaSaoPaulo(agora = new Date()): number {
  const partes = partesAgoraSaoPaulo(agora);
  const decorridos =
    Number(partes.hour) * 3600 +
    Number(partes.minute) * 60 +
    Number(partes.second);
  return Math.max(1, 86400 - decorridos);
}

function limiteDoPlano(plan: string): number {
  return plan === "free"
    ? LIMITE_DIARIO_IA_GRATUITO
    : LIMITE_DIARIO_IA_DEMAIS_PLANOS;
}

// Reserva uma unidade antes da chamada externa. O INSERT ... ON CONFLICT com
// predicado no UPDATE torna a verificacao + incremento atomica entre processos.
export async function consumirCotaDiariaIA(
  userId: string,
): Promise<ConsumoCotaIa> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  if (!user) throw new Error("Conta indisponivel.");

  const dia = diaHojeSaoPaulo();
  const limite = limiteDoPlano(user.plan);
  const linhas = await prisma.$queryRaw<Array<{ chamadas: number }>>`
    INSERT INTO "IaUsage" ("id", "userId", "dia", "chamadas", "updatedAt")
    VALUES (${randomUUID()}, ${userId}, ${dia}, 1, CURRENT_TIMESTAMP)
    ON CONFLICT ("userId", "dia") DO UPDATE
      SET "chamadas" = "IaUsage"."chamadas" + 1,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "IaUsage"."chamadas" < ${limite}
    RETURNING "chamadas"
  `;

  if (linhas.length === 0) {
    throw new CotaIaExcedidaError(
      limite,
      segundosAteProximoDiaSaoPaulo(),
    );
  }

  return { dia, usado: linhas[0].chamadas, limite };
}

// Compatibilidade temporaria para consumidores antigos. Novos fluxos devem
// chamar consumirCotaDiariaIA imediatamente antes da rede.
export async function registrarInteracaoIA(userId: string): Promise<number> {
  return (await consumirCotaDiariaIA(userId)).usado;
}

export async function usoDeHoje(userId: string): Promise<number> {
  const dia = diaHojeSaoPaulo();
  const registro = await prisma.iaUsage.findUnique({
    where: { userId_dia: { userId, dia } },
    select: { chamadas: true },
  });
  return registro?.chamadas ?? 0;
}
