import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Marcações do usuário — DADO SENSÍVEL (LGPD). Sempre escopadas por userId.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const marcacoes = await prisma.verseMark.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ marcacoes });
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

  const { versao, livroCode, livroNome, capitulo, versiculo, texto, cor, observacao } =
    (body ?? {}) as {
      versao?: string;
      livroCode?: string;
      livroNome?: string;
      capitulo?: number;
      versiculo?: number;
      texto?: string;
      cor?: string;
      observacao?: string | null;
    };

  if (
    !versao ||
    !livroCode ||
    !livroNome ||
    !Number.isInteger(capitulo) ||
    !Number.isInteger(versiculo) ||
    !texto?.trim()
  ) {
    return NextResponse.json(
      { error: "Dados da marcação incompletos." },
      { status: 400 },
    );
  }

  // Uma marcação por versículo por usuário: marcar de novo edita a existente.
  const marcacao = await prisma.verseMark.upsert({
    where: {
      userId_translationCode_bookCode_chapter_verse: {
        userId: session.user.id,
        translationCode: versao,
        bookCode: livroCode,
        chapter: capitulo as number,
        verse: versiculo as number,
      },
    },
    create: {
      userId: session.user.id,
      translationCode: versao,
      bookCode: livroCode,
      bookName: livroNome,
      chapter: capitulo as number,
      verse: versiculo as number,
      texto: texto.trim(),
      cor: cor ?? "#93c5fd",
      observacao: observacao?.trim() || null,
    },
    update: {
      cor: cor ?? undefined,
      observacao: observacao !== undefined ? observacao?.trim() || null : undefined,
    },
  });

  return NextResponse.json({ marcacao }, { status: 201 });
}
