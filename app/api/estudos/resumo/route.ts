import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calcularResumoEstudos } from "@/lib/study/estatisticas";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const resumo = await calcularResumoEstudos(session.user.id);
  return NextResponse.json(resumo);
}
