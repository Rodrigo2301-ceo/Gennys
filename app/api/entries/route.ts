import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarRepeticoesFinanceiras } from "@/lib/finance/recorrencia";

const TIPOS_VALIDOS = ["financa", "tarefa", "nota", "habito", "estudo"];

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");
  if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  }

  // Finança travada = despesa fixa: garante as cópias mensais antes de listar.
  if (tipo === "financa") {
    await gerarRepeticoesFinanceiras(session.user.id);
  }

  const entries = await prisma.entry.findMany({
    where: { userId: session.user.id, tipo },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return NextResponse.json({ entries });
}
