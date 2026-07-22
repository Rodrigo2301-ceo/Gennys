import { prisma } from "@/lib/prisma";
import {
  type AiProvider,
  PROVEDOR_PADRAO,
  ehProvedorValido,
} from "@/lib/ai/providers";
import { listarProvedoresDisponiveis } from "@/lib/ai/availability";

export async function obterProvedorIA(userId: string): Promise<AiProvider> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiProvider: true },
  });
  const valor = user?.aiProvider;
  const preferido = ehProvedorValido(valor) ? valor : PROVEDOR_PADRAO;
  if (
    listarProvedoresDisponiveis().some(
      (provider) => provider.valor === preferido && provider.disponivel,
    )
  ) {
    return preferido;
  }
  return (
    listarProvedoresDisponiveis().find((provider) => provider.disponivel)?.valor ??
    preferido
  );
}
