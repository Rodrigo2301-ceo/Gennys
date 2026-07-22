import { gerarRepeticoesFinanceiras } from "@/lib/finance/recorrencia";
import { prisma } from "@/lib/prisma";
import { ApiError, okJson, secureRoute } from "@/lib/security/errors";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import { requireCurrentUser } from "@/lib/security/session";
import { parseEnum } from "@/lib/security/validation";

const TIPOS_VALIDOS = ["financa", "tarefa", "nota", "habito", "estudo"] as const;

export async function GET(req: Request) {
  return secureRoute("entries:list", async () => {
    const current = await requireCurrentUser(RATE_LIMITS.dataRead);
    const { searchParams } = new URL(req.url);
    if (
      searchParams.getAll("tipo").length !== 1 ||
      Array.from(searchParams.keys()).some((key) => key !== "tipo")
    ) {
      throw new ApiError(400, "INVALID_QUERY", "Parâmetros inválidos.");
    }
    const tipo = parseEnum(searchParams.get("tipo"), TIPOS_VALIDOS, "Tipo");

    if (tipo === "financa") {
      await gerarRepeticoesFinanceiras(current.id);
    }

    const entries = await prisma.entry.findMany({
      where: { userId: current.id, tipo },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        tipo: true,
        dados: true,
        valor: true,
        categoria: true,
        locked: true,
        recurring: true,
        transactionDate: true,
        referenceMonth: true,
        excludeFromTotals: true,
        recurrenceKey: true,
        origemRecorrenteId: true,
        mesReferencia: true,
        createdAt: true,
      },
    });

    return okJson({ entries });
  });
}
