import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import GennysApp from "@/components/GennysApp";
import { obterProvedorIA } from "@/lib/ai/preference";
import { listarProvedoresDisponiveis } from "@/lib/ai/availability";
import {
  VERSAO_CONSENTIMENTO_IA,
  obterConsentimentoIaVigente,
} from "@/lib/ai/consent";

export default async function PainelPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const preferido = await obterProvedorIA(session.user.id);
  const provedores = listarProvedoresDisponiveis().filter((p) => p.disponivel);
  const aiProvider =
    provedores.find((p) => p.valor === preferido)?.valor ??
    provedores[0]?.valor ??
    preferido;
  const consentimento = provedores.length
    ? await obterConsentimentoIaVigente(session.user.id, aiProvider)
    : null;

  return (
    <GennysApp
      nome={session.user.name ?? "por aí"}
      aiProvider={aiProvider}
      provedoresDisponiveis={provedores.map(
        ({ valor, label, aceitaImagem }) => ({ valor, label, aceitaImagem }),
      )}
      consentimentoInicial={Boolean(consentimento)}
      consentimentoVersao={VERSAO_CONSENTIMENTO_IA}
    />
  );
}
