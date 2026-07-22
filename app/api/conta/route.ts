import bcrypt from "bcryptjs";
import { ehProvedorValido } from "@/lib/ai/providers";
import { prisma } from "@/lib/prisma";
import { ApiError, okJson, secureRoute } from "@/lib/security/errors";
import {
  RATE_LIMITS,
  userRateLimitHash,
} from "@/lib/security/rateLimit";
import { assertOnlyKeys, parseJsonObject } from "@/lib/security/request";
import { requireCurrentUser } from "@/lib/security/session";
import { parseCurrentPassword } from "@/lib/security/validation";

export async function PATCH(req: Request) {
  return secureRoute("account:provider:update", async () => {
    const current = await requireCurrentUser(RATE_LIMITS.profileWrite);
    const body = await parseJsonObject(req, 4 * 1_024);
    assertOnlyKeys(body, ["aiProvider"]);
    if (!ehProvedorValido(body.aiProvider)) {
      throw new ApiError(
        400,
        "INVALID_AI_PROVIDER",
        "Provedor de IA inválido.",
      );
    }

    await prisma.user.update({
      where: { id: current.id },
      data: { aiProvider: body.aiProvider },
      select: { id: true },
    });
    return okJson({ ok: true });
  });
}

export async function DELETE(req: Request) {
  return secureRoute("account:delete", async () => {
    const current = await requireCurrentUser(RATE_LIMITS.accountDelete);
    const body = await parseJsonObject(req, 4 * 1_024);
    assertOnlyKeys(body, ["senha"]);
    const senha = parseCurrentPassword(body.senha);

    const user = await prisma.user.findUnique({
      where: { id: current.id },
      select: { passwordHash: true },
    });
    if (!user) {
      throw new ApiError(401, "UNAUTHENTICATED", "Não autenticado.");
    }
    if (!(await bcrypt.compare(senha, user.passwordHash))) {
      throw new ApiError(403, "INVALID_CURRENT_PASSWORD", "Senha incorreta.");
    }

    const identifierHash = userRateLimitHash(current.id);
    await prisma.$transaction(async (tx) => {
      await tx.rateLimit.deleteMany({ where: { identifierHash } });
      const deleted = await tx.user.deleteMany({
        where: {
          id: current.id,
          sessionVersion: current.sessionVersion,
          passwordHash: user.passwordHash,
        },
      });
      if (deleted.count !== 1) {
        throw new ApiError(
          409,
          "ACCOUNT_CHANGED",
          "A conta mudou durante a operação. Entre novamente.",
        );
      }
    });

    return okJson({ ok: true });
  });
}
