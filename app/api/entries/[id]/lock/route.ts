import { prisma } from "@/lib/prisma";
import { ApiError, okJson, secureRoute } from "@/lib/security/errors";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import { assertTrustedMutation } from "@/lib/security/request";
import { requireCurrentUser } from "@/lib/security/session";
import { parseId } from "@/lib/security/validation";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  return secureRoute("entries:lock", async () => {
    assertTrustedMutation(req);
    const current = await requireCurrentUser(RATE_LIMITS.dataWrite);
    const id = parseId(params.id, "Registro");
    const entry = await prisma.entry.findFirst({
      where: { id, userId: current.id },
      select: { id: true, locked: true },
    });
    if (!entry) {
      throw new ApiError(404, "ENTRY_NOT_FOUND", "Registro não encontrado.");
    }

    const atualizado = await prisma.entry.update({
      where: { id: entry.id },
      data: { locked: !entry.locked },
      select: ENTRY_SELECT,
    });
    return okJson({ entry: atualizado });
  });
}

const ENTRY_SELECT = {
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
} as const;
