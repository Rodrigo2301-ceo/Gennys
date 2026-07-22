import { prisma } from "@/lib/prisma";
import { ApiError, okJson, secureRoute } from "@/lib/security/errors";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import { assertOnlyKeys, parseJsonObject } from "@/lib/security/request";
import { requireCurrentUser } from "@/lib/security/session";
import {
  parseBoundedCode,
  parseHighlightColor,
  parseOptionalNullableText,
  parsePositiveInteger,
  parseRequiredText,
} from "@/lib/security/validation";

const MARK_SELECT = {
  id: true,
  translationCode: true,
  bookCode: true,
  bookName: true,
  chapter: true,
  verse: true,
  texto: true,
  cor: true,
  observacao: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET() {
  return secureRoute("bible:marks:list", async () => {
    const current = await requireCurrentUser(RATE_LIMITS.bibleRead);
    const result = await prisma.verseMark.findMany({
      where: { userId: current.id },
      orderBy: { createdAt: "desc" },
      take: 501,
      select: MARK_SELECT,
    });
    return okJson({
      marcacoes: result.slice(0, 500),
      limit: 500,
      truncated: result.length > 500,
    });
  });
}

export async function POST(req: Request) {
  return secureRoute("bible:marks:create", async () => {
    const current = await requireCurrentUser(RATE_LIMITS.bibleWrite);
    const body = await parseJsonObject(req, 16 * 1_024);
    assertOnlyKeys(body, [
      "versao",
      "livroCode",
      "livroNome",
      "capitulo",
      "versiculo",
      "texto",
      "cor",
      "observacao",
    ]);

    const versao = parseBoundedCode(body.versao, "Versão");
    const livroCode = parseBoundedCode(body.livroCode, "Livro");
    const livroNome = parseRequiredText(body.livroNome, {
      label: "Nome do livro",
      max: 100,
    });
    const capitulo = parsePositiveInteger(body.capitulo, "Capítulo", 200);
    const versiculo = parsePositiveInteger(body.versiculo, "Versículo", 200);
    const texto = parseRequiredText(body.texto, {
      label: "Texto do versículo",
      max: 5_000,
    });
    const cor = parseHighlightColor(body.cor ?? "#93c5fd");
    const observacao = parseOptionalNullableText(body.observacao, {
      label: "Observação",
      max: 2_000,
    });

    const traducao = await prisma.bibleTranslation.findUnique({
      where: { code: versao },
      select: { id: true },
    });
    const book = traducao
      ? await prisma.bibleBook.findUnique({
          where: {
            translationId_code: {
              translationId: traducao.id,
              code: livroCode,
            },
          },
          select: { id: true, code: true, name: true },
        })
      : null;
    const canonicalVerse = book
      ? await prisma.bibleVerse.findUnique({
          where: {
            bookId_chapter_number: {
              bookId: book.id,
              chapter: capitulo,
              number: versiculo,
            },
          },
          select: { text: true },
        })
      : null;
    if (!book || !canonicalVerse) {
      throw new ApiError(404, "VERSE_NOT_FOUND", "Versículo não encontrado.");
    }
    if (book.name !== livroNome || canonicalVerse.text.trim() !== texto) {
      throw new ApiError(
        409,
        "VERSE_SNAPSHOT_MISMATCH",
        "Os dados do versículo não correspondem ao texto oficial.",
      );
    }

    const marcacao = await prisma.verseMark.upsert({
      where: {
        userId_translationCode_bookCode_chapter_verse: {
          userId: current.id,
          translationCode: versao,
          bookCode: book.code,
          chapter: capitulo,
          verse: versiculo,
        },
      },
      create: {
        userId: current.id,
        translationCode: versao,
        bookCode: book.code,
        bookName: book.name,
        chapter: capitulo,
        verse: versiculo,
        texto: canonicalVerse.text,
        cor,
        observacao: observacao ?? null,
      },
      update: {
        bookName: book.name,
        texto: canonicalVerse.text,
        cor,
        observacao: observacao === undefined ? undefined : observacao,
      },
      select: MARK_SELECT,
    });
    return okJson({ marcacao }, 201);
  });
}
