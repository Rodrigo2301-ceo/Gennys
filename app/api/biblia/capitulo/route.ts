import { prisma } from "@/lib/prisma";
import { ApiError, okJson, secureRoute } from "@/lib/security/errors";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import { requireCurrentUser } from "@/lib/security/session";
import {
  parseBoundedCode,
  parsePositiveInteger,
} from "@/lib/security/validation";

export async function GET(req: Request) {
  return secureRoute("bible:chapter", async () => {
    await requireCurrentUser(RATE_LIMITS.bibleRead);
    const { searchParams } = new URL(req.url);
    if (
      ["versao", "livro", "cap"].some(
        (key) => searchParams.getAll(key).length !== 1,
      ) ||
      Array.from(searchParams.keys()).some(
        (key) => key !== "versao" && key !== "livro" && key !== "cap",
      )
    ) {
      throw new ApiError(400, "INVALID_QUERY", "Parâmetros inválidos.");
    }
    const versao = parseBoundedCode(searchParams.get("versao"), "Versão");
    const livro = parseBoundedCode(searchParams.get("livro"), "Livro");
    const capitulo = parsePositiveInteger(
      searchParams.get("cap"),
      "Capítulo",
      200,
    );

    const traducao = await prisma.bibleTranslation.findUnique({
      where: { code: versao },
      select: { id: true },
    });
    if (!traducao) {
      throw new ApiError(404, "TRANSLATION_NOT_FOUND", "Versão não encontrada.");
    }
    const book = await prisma.bibleBook.findUnique({
      where: {
        translationId_code: { translationId: traducao.id, code: livro },
      },
      select: { id: true, code: true, name: true },
    });
    if (!book) {
      throw new ApiError(404, "BOOK_NOT_FOUND", "Livro não encontrado.");
    }

    const [versiculos, aggregate] = await Promise.all([
      prisma.bibleVerse.findMany({
        where: { bookId: book.id, chapter: capitulo },
        orderBy: { number: "asc" },
        select: { number: true, text: true },
      }),
      prisma.bibleVerse.aggregate({
        where: { bookId: book.id },
        _max: { chapter: true },
      }),
    ]);
    if (versiculos.length === 0) {
      throw new ApiError(404, "CHAPTER_NOT_FOUND", "Capítulo não encontrado.");
    }
    return okJson({
      livroCode: book.code,
      livroNome: book.name,
      capitulo,
      numCapitulos: aggregate._max.chapter ?? capitulo,
      versiculos: versiculos.map((verse) => ({
        numero: verse.number,
        texto: verse.text,
      })),
    });
  });
}
