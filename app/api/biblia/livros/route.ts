import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Lista os livros de uma tradução, com o número de capítulos de cada um.
// Uma chamada só entrega toda a árvore de navegação (livro -> capítulo).
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const versao = searchParams.get("versao");
  if (!versao) {
    return NextResponse.json({ error: "Versão não informada." }, { status: 400 });
  }

  const traducao = await prisma.bibleTranslation.findUnique({
    where: { code: versao },
    select: { id: true },
  });
  if (!traducao) {
    return NextResponse.json({ error: "Versão não encontrada." }, { status: 404 });
  }

  const books = await prisma.bibleBook.findMany({
    where: { translationId: traducao.id },
    orderBy: { position: "asc" },
    select: { id: true, code: true, name: true, abbrev: true, testamento: true },
  });

  // Nº de capítulos = maior número de capítulo do livro (capítulos são 1..N).
  const counts = await prisma.bibleVerse.groupBy({
    by: ["bookId"],
    where: { bookId: { in: books.map((b) => b.id) } },
    _max: { chapter: true },
  });
  const capsPorLivro = new Map(counts.map((c) => [c.bookId, c._max.chapter ?? 0]));

  const livros = books.map((b) => ({
    code: b.code,
    name: b.name,
    abbrev: b.abbrev,
    testamento: b.testamento,
    numCapitulos: capsPorLivro.get(b.id) ?? 0,
  }));

  return NextResponse.json({ livros });
}
