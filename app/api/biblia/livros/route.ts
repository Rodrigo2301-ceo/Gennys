import { prisma } from "@/lib/prisma";
import { ApiError, okJson, secureRoute } from "@/lib/security/errors";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import { requireCurrentUser } from "@/lib/security/session";
import { parseBoundedCode } from "@/lib/security/validation";

export async function GET(req: Request) {
  return secureRoute("bible:books", async () => {
    await requireCurrentUser(RATE_LIMITS.bibleRead);
    const { searchParams } = new URL(req.url);
    if (
      searchParams.getAll("versao").length !== 1 ||
      Array.from(searchParams.keys()).some((key) => key !== "versao")
    ) {
      throw new ApiError(400, "INVALID_QUERY", "Parâmetros inválidos.");
    }
    const versao = parseBoundedCode(searchParams.get("versao"), "Versão");
    const traducao = await prisma.bibleTranslation.findUnique({
      where: { code: versao },
      select: { id: true },
    });
    if (!traducao) {
      throw new ApiError(404, "TRANSLATION_NOT_FOUND", "Versão não encontrada.");
    }

    const books = await prisma.bibleBook.findMany({
      where: { translationId: traducao.id },
      orderBy: { position: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        abbrev: true,
        testamento: true,
      },
    });
    const counts = await prisma.bibleVerse.groupBy({
      by: ["bookId"],
      where: { bookId: { in: books.map((book) => book.id) } },
      _max: { chapter: true },
    });
    const chapters = new Map(
      counts.map((item) => [item.bookId, item._max.chapter ?? 0]),
    );
    return okJson({
      livros: books.map((book) => ({
        code: book.code,
        name: book.name,
        abbrev: book.abbrev,
        testamento: book.testamento,
        numCapitulos: chapters.get(book.id) ?? 0,
      })),
    });
  });
}
