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
  parseId,
  parseOptionalNullableText,
  parseRequiredText,
} from "@/lib/security/validation";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  return secureRoute("memories:update", async () => {
    const current = await requireCurrentUser(RATE_LIMITS.dataWrite);
    const id = parseId(params.id, "Memória");
    const body = await parseJsonObject(req, 8 * 1_024);
    assertOnlyKeys(body, ["fato", "categoria"]);

    const data: { fato?: string; categoria?: string | null } = {};
    if (body.fato !== undefined) {
      data.fato = parseRequiredText(body.fato, { label: "Fato", max: 1_000 });
    }
    if (body.categoria !== undefined) {
      data.categoria = parseOptionalNullableText(body.categoria, {
        label: "Categoria",
        max: 80,
      });
    }
    if (Object.keys(data).length === 0) {
      throw new ApiError(400, "NOTHING_TO_UPDATE", "Nada para atualizar.");
    }

    const memory = await prisma.memory.findFirst({
      where: { id, userId: current.id },
      select: { id: true },
    });
    if (!memory) {
      throw new ApiError(404, "MEMORY_NOT_FOUND", "Memória não encontrada.");
    }

    const atualizado = await prisma.memory.update({
      where: { id: memory.id },
      data,
      select: {
        id: true,
        fato: true,
        categoria: true,
        createdAt: true,
      },
    });
    return okJson({ memory: atualizado });
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  return secureRoute("memories:delete", async () => {
    assertTrustedMutation(req);
    const current = await requireCurrentUser(RATE_LIMITS.dataWrite);
    const id = parseId(params.id, "Memória");
    const memory = await prisma.memory.findFirst({
      where: { id, userId: current.id },
      select: { id: true },
    });
    if (!memory) {
      throw new ApiError(404, "MEMORY_NOT_FOUND", "Memória não encontrada.");
    }
    await prisma.memory.delete({ where: { id: memory.id } });
    return okJson({ ok: true });
  });
}
