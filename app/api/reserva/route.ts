import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buscarPlanoAtual,
  calcularMediaFinanceira,
  calcularPrazoMeses,
  salvarPlano,
  sugerirMetaEmergencia,
  sugerirValorMensal,
  type PlanoReservaDados,
} from "@/lib/finance/reserva";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const [media, planoAtual] = await Promise.all([
    calcularMediaFinanceira(session.user.id),
    buscarPlanoAtual(session.user.id),
  ]);

  return NextResponse.json({
    media,
    sugestaoValorMensal: sugerirValorMensal(media),
    sugestaoMetaEmergencia: sugerirMetaEmergencia(media),
    plano: planoAtual,
  });
}

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

  const { objetivo, metaValor, modo, valorManual } = (body ?? {}) as {
    objetivo?: string;
    metaValor?: number | null;
    modo?: "manual" | "sugestao";
    valorManual?: number;
  };

  if (!objetivo?.trim()) {
    return NextResponse.json(
      { error: "Descreva o objetivo (reserva ou meta)." },
      { status: 400 },
    );
  }
  if (modo !== "manual" && modo !== "sugestao") {
    return NextResponse.json({ error: "Modo inválido." }, { status: 400 });
  }

  const media = await calcularMediaFinanceira(session.user.id);

  let valorMensal: number;
  if (modo === "manual") {
    if (!valorManual || valorManual <= 0) {
      return NextResponse.json(
        { error: "Informe um valor mensal válido." },
        { status: 400 },
      );
    }
    valorMensal = valorManual;
  } else {
    valorMensal = sugerirValorMensal(media);
  }

  const meta =
    metaValor && metaValor > 0 ? metaValor : sugerirMetaEmergencia(media) || null;
  const prazoMeses = meta ? calcularPrazoMeses(meta, valorMensal) : null;

  const plano: PlanoReservaDados = {
    objetivo: objetivo.trim(),
    metaValor: meta,
    valorMensal,
    prazoMeses,
    modo,
  };

  const salvo = await salvarPlano(session.user.id, plano);

  return NextResponse.json({ plano: salvo, media });
}
