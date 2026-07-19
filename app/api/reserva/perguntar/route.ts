import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calcularMediaFinanceira } from "@/lib/finance/reserva";
import { responderPerguntaReserva } from "@/lib/finance/assistente";
import { registrarInteracaoIA } from "@/lib/ai/usage";
import { obterProvedorIA } from "@/lib/ai/preference";

// Q&A livre dentro do plano de reserva (ex.: "onde invisto?").
// Mantém a mesma regra anti-investimento do motor principal.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const { pergunta } = (body ?? {}) as { pergunta?: string };
  if (!pergunta?.trim()) {
    return NextResponse.json(
      { error: "Envie uma pergunta." },
      { status: 400 },
    );
  }

  try {
    const media = await calcularMediaFinanceira(session.user.id);
    const provedor = await obterProvedorIA(session.user.id);
    const resposta = await responderPerguntaReserva(pergunta.trim(), media, provedor);
    await registrarInteracaoIA(session.user.id);
    return NextResponse.json({ resposta });
  } catch (err) {
    console.error("[reserva] erro:", err);
    return NextResponse.json(
      { error: "Não consegui responder agora. Tente de novo." },
      { status: 500 },
    );
  }
}
