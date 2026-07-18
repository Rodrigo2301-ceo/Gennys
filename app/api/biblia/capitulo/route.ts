import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Versículos de um capítulo específico, para leitura.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const versao = searchParams.get("versao");
  const livro = searchParams.get("livro");
  const cap = Number(searchParams.get("cap"));

  if (!versao || !livro || !Number.isInteger(cap) || cap < 1) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const traducao = await prisma.bibleTranslation.findUnique({
    where: { code: versao },
    select: { id: true },
  });
  if (!traducao) {
    return NextResponse.json({ error: "Versão não encontrada." }, { status: 404 });
  }

  const book = await prisma.bibleBook.findUnique({
    where: { translationId_code: { translationId: traducao.id, code: livro } },
    select: { id: true, code: true, name: true },
  });
  if (!book) {
    return NextResponse.json({ error: "Livro não encontrado." }, { status: 404 });
  }

  const [versiculos, agg] = await Promise.all([
    prisma.bibleVerse.findMany({
      where: { bookId: book.id, chapter: cap },
      orderBy: { number: "asc" },
      select: { number: true, text: true },
    }),
    prisma.bibleVerse.aggregate({
      where: { bookId: book.id },
      _max: { chapter: true },
    }),
  ]);

  if (versiculos.length === 0) {
    return NextResponse.json({ error: "Capítulo não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    livroCode: book.code,
    livroNome: book.name,
    capitulo: cap,
    numCapitulos: agg._max.chapter ?? cap,
    versiculos: versiculos.map((v) => ({ numero: v.number, texto: v.text })),
  });
}
