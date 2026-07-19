import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import GennysApp from "@/components/GennysApp";
import { obterProvedorIA } from "@/lib/ai/preference";

export default async function PainelPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const aiProvider = await obterProvedorIA(session.user.id);

  return <GennysApp nome={session.user.name ?? "por aí"} aiProvider={aiProvider} />;
}
