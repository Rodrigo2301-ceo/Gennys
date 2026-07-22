import { prisma } from "@/lib/prisma";
import {
  dataCivilParaDate,
  dataFinanceiraEfetiva,
} from "@/lib/finance/datas";
import { gerarRepeticoesFinanceiras } from "@/lib/finance/recorrencia";
import { ApiError, okJson, secureRoute } from "@/lib/security/errors";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import {
  assertOnlyKeys,
  parseJsonObject,
} from "@/lib/security/request";
import { requireCurrentUser } from "@/lib/security/session";
import { parseId } from "@/lib/security/validation";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  return secureRoute("entries:recurrence", async () => {
    const user = await requireCurrentUser(RATE_LIMITS.dataWrite);
    const id = parseId(params.id, "Registro");
    const body = await parseJsonObject(req, 1024);
    assertOnlyKeys(body, ["recurring"]);
    if (typeof body.recurring !== "boolean") {
      throw new ApiError(
        400,
        "INVALID_RECURRENCE_STATE",
        "Estado de recorrência inválido.",
      );
    }

    const entry = await prisma.entry.findFirst({
      where: { id, userId: user.id },
    });
    if (!entry) {
      throw new ApiError(404, "ENTRY_NOT_FOUND", "Registro não encontrado.");
    }
    if (entry.tipo !== "financa" || entry.origemRecorrenteId) {
      throw new ApiError(
        400,
        "INVALID_RECURRENCE_ENTRY",
        "Somente um lançamento financeiro original pode ser recorrente.",
      );
    }

    const dataCivil = dataFinanceiraEfetiva(entry);
    await prisma.entry.update({
      where: { id: entry.id },
      data: {
        recurring: body.recurring,
        transactionDate: entry.transactionDate ?? dataCivilParaDate(dataCivil),
        referenceMonth: entry.referenceMonth ?? dataCivil.slice(0, 7),
      },
    });

    if (body.recurring) await gerarRepeticoesFinanceiras(user.id);
    const atualizado = await prisma.entry.findUnique({ where: { id: entry.id } });
    return okJson({ entry: atualizado });
  });
}
