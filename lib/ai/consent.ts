import { prisma } from "@/lib/prisma";
import type { AiProvider } from "./providers";

export const VERSAO_CONSENTIMENTO_IA = "2026-07-22.v1";
export const FINALIDADE_CONSENTIMENTO_IA = "assistente";

export interface ConsentimentoIaVigente {
  id: string;
  provider: AiProvider;
  version: string;
  purpose: string;
  grantedAt: Date;
}

export class ConsentimentoIaNecessarioError extends Error {
  constructor(public readonly provider: AiProvider) {
    super("Consentimento de IA necessario.");
    this.name = "ConsentimentoIaNecessarioError";
  }
}

export async function obterConsentimentoIaVigente(
  userId: string,
  provider: AiProvider,
): Promise<ConsentimentoIaVigente | null> {
  const consentimento = await prisma.aiConsent.findFirst({
    where: {
      userId,
      provider,
      version: VERSAO_CONSENTIMENTO_IA,
      purpose: FINALIDADE_CONSENTIMENTO_IA,
      revokedAt: null,
    },
    orderBy: { grantedAt: "desc" },
    select: {
      id: true,
      provider: true,
      version: true,
      purpose: true,
      grantedAt: true,
    },
  });

  if (!consentimento) return null;
  return {
    ...consentimento,
    provider: consentimento.provider as AiProvider,
  };
}

export async function exigirConsentimentoIaVigente(
  userId: string,
  provider: AiProvider,
): Promise<ConsentimentoIaVigente> {
  const consentimento = await obterConsentimentoIaVigente(userId, provider);
  if (!consentimento) throw new ConsentimentoIaNecessarioError(provider);
  return consentimento;
}

export async function concederConsentimentoIa(
  userId: string,
  provider: AiProvider,
): Promise<ConsentimentoIaVigente> {
  const agora = new Date();
  const consentimento = await prisma.$transaction(async (tx) => {
    await tx.aiConsent.updateMany({
      where: {
        userId,
        provider,
        purpose: FINALIDADE_CONSENTIMENTO_IA,
        revokedAt: null,
      },
      data: { revokedAt: agora },
    });

    return tx.aiConsent.create({
      data: {
        userId,
        provider,
        version: VERSAO_CONSENTIMENTO_IA,
        purpose: FINALIDADE_CONSENTIMENTO_IA,
        grantedAt: agora,
      },
      select: {
        id: true,
        provider: true,
        version: true,
        purpose: true,
        grantedAt: true,
      },
    });
  });

  return {
    ...consentimento,
    provider: consentimento.provider as AiProvider,
  };
}

export async function revogarConsentimentoIa(
  userId: string,
  provider: AiProvider,
): Promise<number> {
  const resultado = await prisma.aiConsent.updateMany({
    where: {
      userId,
      provider,
      purpose: FINALIDADE_CONSENTIMENTO_IA,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
  return resultado.count;
}
