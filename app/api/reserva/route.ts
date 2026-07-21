import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buscarPlanoAtual,
  calcularMediaFinanceira,
  calcularPrazoMeses,
  mesesAteData,
  MESES_RESERVA_EMERGENCIA,
  salvarPlano,
  sugerirMetaEmergencia,
  sugerirValorMensal,
  valorMensalPorPrazo,
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
    mesesReservaEmergencia: MESES_RESERVA_EMERGENCIA,
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

  const { objetivo, metaValor, modo, valorManual, dataAlvo } = (body ?? {}) as {
    objetivo?: string;
    metaValor?: number | null;
    modo?: "manual" | "sugestao" | "prazo";
    valorManual?: number;
    dataAlvo?: string;
  };

  if (!objetivo?.trim()) {
    return NextResponse.json(
      { error: "Descreva o objetivo (reserva ou meta)." },
      { status: 400 },
    );
  }
  if (modo !== "manual" && modo !== "sugestao" && modo !== "prazo") {
    return NextResponse.json({ error: "Modo inválido." }, { status: 400 });
  }

  const media = await calcularMediaFinanceira(session.user.id);
  const meta =
    metaValor && metaValor > 0 ? metaValor : sugerirMetaEmergencia(media) || null;

  let valorMensal: number;
  let dataAlvoSalva: string | null = null;
  let prazoMeses: number | null;

  if (modo === "manual") {
    if (!valorManual || valorManual <= 0) {
      return NextResponse.json(
        { error: "Informe um valor mensal válido." },
        { status: 400 },
      );
    }
    valorMensal = valorManual;
    prazoMeses = meta ? calcularPrazoMeses(meta, valorMensal) : null;
  } else if (modo === "prazo") {
    if (!meta || meta <= 0) {
      return NextResponse.json(
        { error: "Defina uma meta em R$ para usar o prazo." },
        { status: 400 },
      );
    }
    const meses = dataAlvo ? mesesAteData(dataAlvo) : null;
    if (!meses) {
      return NextResponse.json(
        { error: "Escolha uma data-alvo no futuro." },
        { status: 400 },
      );
    }
    valorMensal = valorMensalPorPrazo(meta, meses);
    prazoMeses = meses;
    dataAlvoSalva = dataAlvo ?? null;
  } else {
    valorMensal = sugerirValorMensal(media);
    prazoMeses = meta ? calcularPrazoMeses(meta, valorMensal) : null;
  }

  const plano: PlanoReservaDados = {
    objetivo: objetivo.trim(),
    metaValor: meta,
    valorMensal,
    prazoMeses,
    dataAlvo: dataAlvoSalva,
    modo,
  };

  const salvo = await salvarPlano(session.user.id, plano);

  return NextResponse.json({ plano: salvo, media });
}
