import { prisma } from "@/lib/prisma";

// Cérebro do Gennys: memórias duráveis por usuário.
// Entram no contexto de toda chamada seguinte (o Gennys nunca esquece).

const LIMITE_CONTEXTO = 60;

export async function carregarMemorias(userId: string): Promise<string[]> {
  const registros = await prisma.memory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: LIMITE_CONTEXTO,
    select: { fato: true },
  });
  return registros.map((r) => r.fato);
}

export async function salvarMemorias(
  userId: string,
  memorias: { fato: string; categoria: string | null }[],
): Promise<void> {
  if (memorias.length === 0) return;

  // Dedup simples contra o que já existe (case-insensitive, comparação exata).
  const existentes = await prisma.memory.findMany({
    where: { userId },
    select: { fato: true },
  });
  const jaTem = new Set(existentes.map((e) => e.fato.trim().toLowerCase()));

  const novas = memorias.filter(
    (m) => !jaTem.has(m.fato.trim().toLowerCase()),
  );
  if (novas.length === 0) return;

  await prisma.memory.createMany({
    data: novas.map((m) => ({
      userId,
      fato: m.fato,
      categoria: m.categoria,
    })),
  });
}
