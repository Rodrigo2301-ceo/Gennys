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
  parseHighlightColor,
  parseId,
  parseOptionalNullableText,
} from "@/lib/security/validation";

const MARK_SELECT = {
  id: true,
  translationCode: true,
  bookCode: true,
  bookName: true,
  chapter: true,
  verse: true,
  texto: true,
  cor: true,
  observacao: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  return secureRoute("bible:marks:update", async () => {
    const current = await requireCurrentUser(RATE_LIMITS.bibleWrite);
    const id = parseId(params.id, "Marcação");
    const body = await parseJsonObject(req, 8 * 1_024);
    assertOnlyKeys(body, ["cor", "observacao"]);

    const data: { cor?: string; observacao?: string | null } = {};
    if (body.cor !== undefined) data.cor = parseHighlightColor(body.cor);
    if (body.observacao !== undefined) {
      data.observacao = parseOptionalNullableText(body.observacao, {
        label: "Observação",
        max: 2_000,
      });
    }
    if (Object.keys(data).length === 0) {
      throw new ApiError(400, "NOTHING_TO_UPDATE", "Nada para atualizar.");
    }

    const existente = await prisma.verseMark.findFirst({
      where: { id, userId: current.id },
      select: { id: true },
    });
    if (!existente) {
      throw new ApiError(404, "MARK_NOT_FOUND", "Marcação não encontrada.");
    }
    const marcacao = await prisma.verseMark.update({
      where: { id: existente.id },
      data,
      select: MARK_SELECT,
    });
    return okJson({ marcacao });
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  return secureRoute("bible:marks:delete", async () => {
    assertTrustedMutation(req);
    const current = await requireCurrentUser(RATE_LIMITS.bibleWrite);
    const id = parseId(params.id, "Marcação");
    const existente = await prisma.verseMark.findFirst({
      where: { id, userId: current.id },
      select: { id: true },
    });
    if (!existente) {
      throw new ApiError(404, "MARK_NOT_FOUND", "Marcação não encontrada.");
    }
    await prisma.verseMark.delete({ where: { id: existente.id } });
    return okJson({ ok: true });
  });
}
