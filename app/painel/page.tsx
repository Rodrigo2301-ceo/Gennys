import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import GennysApp from "@/components/GennysApp";

export default async function PainelPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return <GennysApp nome={session.user.name ?? "por aí"} />;
}
