import { prisma } from "@/lib/prisma";
import {
  type AiProvider,
  PROVEDOR_PADRAO,
  ehProvedorValido,
} from "@/lib/ai/providers";

export async function obterProvedorIA(userId: string): Promise<AiProvider> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiProvider: true },
  });
  const valor = user?.aiProvider;
  return ehProvedorValido(valor) ? valor : PROVEDOR_PADRAO;
}
