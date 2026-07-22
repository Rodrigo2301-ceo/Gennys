import bcrypt from "bcryptjs";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, okJson, secureRoute } from "@/lib/security/errors";
import { limitByUser, RATE_LIMITS } from "@/lib/security/rateLimit";
import { assertOnlyKeys, parseJsonObject } from "@/lib/security/request";
import { requireCurrentUser } from "@/lib/security/session";
import {
  civilDateToLegacyDate,
  legacyDateToCivil,
  parseBirthDateCivil,
  parseCurrentPassword,
  parseEmail,
  parseNewPassword,
  parseRequiredText,
} from "@/lib/security/validation";

const MAX_PROFILE_BODY = 8 * 1_024;

const PROFILE_SELECT = {
  name: true,
  email: true,
  birthDate: true,
  birthDateCivil: true,
  plan: true,
  aiProvider: true,
  createdAt: true,
} as const;

function perfilPublico(user: {
  name: string;
  email: string;
  birthDate: Date | null;
  birthDateCivil: string | null;
  plan: string;
  aiProvider: string;
  createdAt: Date;
}) {
  return {
    name: user.name,
    email: user.email,
    birthDate: user.birthDateCivil ?? legacyDateToCivil(user.birthDate),
    plan: user.plan,
    aiProvider: user.aiProvider,
    createdAt: user.createdAt,
  };
}

export async function GET() {
  return secureRoute("profile:read", async () => {
    const current = await requireCurrentUser(RATE_LIMITS.profileRead);
    const user = await prisma.user.findUnique({
      where: { id: current.id },
      select: PROFILE_SELECT,
    });
    if (!user) {
      throw new ApiError(401, "UNAUTHENTICATED", "Não autenticado.");
    }
    return okJson({ perfil: perfilPublico(user) });
  });
}

export async function PATCH(req: Request) {
  return secureRoute("profile:update", async () => {
    const current = await requireCurrentUser(RATE_LIMITS.profileWrite);
    const body = await parseJsonObject(req, MAX_PROFILE_BODY);
    assertOnlyKeys(body, [
      "name",
      "birthDate",
      "email",
      "novaSenha",
      "senhaAtual",
    ]);

    const data: Prisma.UserUpdateInput = {};
    if (body.name !== undefined) {
      data.name = parseRequiredText(body.name, { label: "Nome", max: 100 });
    }

    if (body.birthDate !== undefined) {
      if (body.birthDate === null || body.birthDate === "") {
        data.birthDateCivil = null;
        data.birthDate = null;
      } else {
        const civil = parseBirthDateCivil(body.birthDate);
        data.birthDateCivil = civil;
        data.birthDate = civilDateToLegacyDate(civil);
      }
    }

    const querTrocarEmail = body.email !== undefined;
    const querTrocarSenha =
      body.novaSenha !== undefined && body.novaSenha !== "";
    const novoEmail = querTrocarEmail ? parseEmail(body.email) : undefined;
    const novaSenha = querTrocarSenha
      ? parseNewPassword(body.novaSenha)
      : undefined;

    if (querTrocarEmail || querTrocarSenha) {
      await limitByUser(current.id, RATE_LIMITS.sensitiveAccount);
      const senhaAtual = parseCurrentPassword(body.senhaAtual);
      const user = await prisma.user.findUnique({
        where: { id: current.id },
        select: { passwordHash: true },
      });
      if (!user) {
        throw new ApiError(401, "UNAUTHENTICATED", "Não autenticado.");
      }
      if (!(await bcrypt.compare(senhaAtual, user.passwordHash))) {
        throw new ApiError(403, "INVALID_CURRENT_PASSWORD", "Senha atual incorreta.");
      }

      if (novoEmail !== undefined) data.email = novoEmail;
      if (novaSenha !== undefined) {
        if (await bcrypt.compare(novaSenha, user.passwordHash)) {
          throw new ApiError(
            400,
            "PASSWORD_REUSE",
            "Escolha uma senha diferente da atual.",
          );
        }
        data.passwordHash = await bcrypt.hash(novaSenha, 12);
        data.sessionVersion = { increment: 1 };
      }
    } else if (body.senhaAtual !== undefined) {
      throw new ApiError(400, "UNEXPECTED_PASSWORD", "Nada para atualizar.");
    }

    if (Object.keys(data).length === 0) {
      throw new ApiError(400, "NOTHING_TO_UPDATE", "Nada para atualizar.");
    }

    try {
      const atualizado = await prisma.user.update({
        where: { id: current.id },
        data,
        select: PROFILE_SELECT,
      });
      return okJson({
        ok: true,
        perfil: perfilPublico(atualizado),
        sessionInvalidated: querTrocarSenha,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ApiError(
          409,
          "EMAIL_ALREADY_EXISTS",
          "Já existe uma conta com esse e-mail.",
        );
      }
      throw error;
    }
  });
}
