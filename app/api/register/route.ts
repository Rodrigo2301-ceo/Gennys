import bcrypt from "bcryptjs";
import { Prisma } from "@/app/generated/prisma/client";
import { PROVEDOR_PADRAO } from "@/lib/ai/providers";
import { prisma } from "@/lib/prisma";
import { ApiError, okJson, secureRoute } from "@/lib/security/errors";
import { limitByIp, RATE_LIMITS } from "@/lib/security/rateLimit";
import { assertOnlyKeys, parseJsonObject } from "@/lib/security/request";
import {
  civilDateToLegacyDate,
  parseBirthDateCivil,
  parseEmail,
  parseNewPassword,
  parseRequiredText,
} from "@/lib/security/validation";

const MAX_REGISTER_BODY = 8 * 1_024;

export async function POST(req: Request) {
  return secureRoute("register:create", async () => {
    await limitByIp(req.headers, RATE_LIMITS.register);
    const body = await parseJsonObject(req, MAX_REGISTER_BODY);
    assertOnlyKeys(body, ["nome", "email", "senha", "dataNascimento"]);

    const nome = parseRequiredText(body.nome, { label: "Nome", max: 100 });
    const email = parseEmail(body.email);
    const senha = parseNewPassword(body.senha);

    let birthDateCivil: string | null = null;
    if (body.dataNascimento !== undefined && body.dataNascimento !== "") {
      birthDateCivil = parseBirthDateCivil(body.dataNascimento);
    }

    try {
      await prisma.user.create({
        data: {
          name: nome,
          email,
          passwordHash: await bcrypt.hash(senha, 12),
          birthDateCivil,
          birthDate: birthDateCivil
            ? civilDateToLegacyDate(birthDateCivil)
            : null,
          aiProvider: PROVEDOR_PADRAO,
          sessionVersion: 0,
        },
        select: { id: true },
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

    return okJson({ ok: true }, 201);
  });
}
