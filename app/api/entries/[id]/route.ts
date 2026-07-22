import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, okJson, secureRoute } from "@/lib/security/errors";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import {
  assertOnlyKeys,
  assertTrustedMutation,
  parseJsonObject,
} from "@/lib/security/request";
import { requireCurrentUser } from "@/lib/security/session";
import {
  parseCivilDate,
  parseId,
  parseJsonRecord,
  parseMoney,
  parseOptionalNullableText,
} from "@/lib/security/validation";

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

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  return secureRoute("entries:update", async () => {
    const current = await requireCurrentUser(RATE_LIMITS.dataWrite);
    const id = parseId(params.id, "Registro");
    const entry = await prisma.entry.findFirst({
      where: { id, userId: current.id },
      select: { id: true, tipo: true, locked: true },
    });
    if (!entry) {
      throw new ApiError(404, "ENTRY_NOT_FOUND", "Registro não encontrado.");
    }
    if (entry.locked) {
      throw new ApiError(
        423,
        "ENTRY_LOCKED",
        "Registro travado. Destrave para editar.",
      );
    }

    const body = await parseJsonObject(req, 32 * 1_024);
    assertOnlyKeys(body, ["categoria", "valor", "dados", "transactionDate"]);
    const data: Prisma.EntryUpdateInput = {};

    if (body.categoria !== undefined) {
      data.categoria = parseOptionalNullableText(body.categoria, {
        label: "Categoria",
        max: 80,
      });
    }
    if (body.valor !== undefined) {
      if (entry.tipo !== "financa" && body.valor !== null) {
        throw new ApiError(
          400,
          "AMOUNT_NOT_ALLOWED",
          "Valor só é permitido em registros financeiros.",
        );
      }
      data.valor = body.valor === null ? null : parseMoney(body.valor);
    }
    if (body.dados !== undefined) {
      data.dados = parseJsonRecord(body.dados) as Prisma.InputJsonValue;
    }
    if (body.transactionDate !== undefined) {
      if (entry.tipo !== "financa") {
        throw new ApiError(
          400,
          "DATE_NOT_ALLOWED",
          "Data financeira não é permitida neste registro.",
        );
      }
      const civil = parseCivilDate(body.transactionDate);
      data.transactionDate = new Date(`${civil}T00:00:00.000Z`);
      data.referenceMonth = civil.slice(0, 7);
    }
    if (Object.keys(data).length === 0) {
      throw new ApiError(400, "NOTHING_TO_UPDATE", "Nada para atualizar.");
    }

    const atualizado = await prisma.entry.update({
      where: { id: entry.id },
      data,
      select: ENTRY_SELECT,
    });
    return okJson({ entry: atualizado });
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  return secureRoute("entries:delete", async () => {
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
    if (entry.locked) {
      throw new ApiError(
        423,
        "ENTRY_LOCKED",
        "Registro travado. Destrave para excluir.",
      );
    }

    await prisma.entry.delete({ where: { id: entry.id } });
    return okJson({ ok: true });
  });
}
