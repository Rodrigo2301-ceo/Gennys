/**
 * Importa uma tradução da Bíblia (JSON em data/biblia/) para o PostgreSQL.
 *
 * Uso: npm run seed:biblia
 *
 * Idempotente: se a tradução já estiver importada (tem livros), não faz nada.
 * O texto vem de um dataset em DOMÍNIO PÚBLICO (Almeida 1911), nunca digitado
 * à mão — garante que não há erros de texto.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

interface LivroJSON {
  id: number;
  code: string;
  name: string;
  abbrev: string;
  chapters: { number: number; verses: { number: number; text: string }[] }[];
}
interface BibliaJSON {
  code: string;
  name: string;
  year: number | null;
  license: string;
  books: LivroJSON[];
}

const ARQUIVO = "ALM1911.json"; // troque aqui para importar outra tradução PD

async function main() {
  const aqui = dirname(fileURLToPath(import.meta.url));
  const caminho = join(aqui, "..", "data", "biblia", ARQUIVO);
  const biblia = JSON.parse(readFileSync(caminho, "utf-8")) as BibliaJSON;

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const existente = await prisma.bibleTranslation.findUnique({
      where: { code: biblia.code },
      include: { _count: { select: { books: true } } },
    });
    if (existente && existente._count.books > 0) {
      console.log(
        `Tradução ${biblia.code} já importada (${existente._count.books} livros). Nada a fazer.`,
      );
      return;
    }

    const traducao =
      existente ??
      (await prisma.bibleTranslation.create({
        data: {
          code: biblia.code,
          name: biblia.name,
          year: biblia.year,
          license: biblia.license,
        },
      }));

    console.log(`Importando ${biblia.name} (${biblia.books.length} livros)…`);
    let totalVersiculos = 0;

    for (const livro of biblia.books) {
      const book = await prisma.bibleBook.create({
        data: {
          translationId: traducao.id,
          code: livro.code,
          name: livro.name,
          abbrev: livro.abbrev,
          position: livro.id,
          testamento: livro.id <= 39 ? "AT" : "NT",
        },
      });

      const versiculos = livro.chapters.flatMap((cap) =>
        cap.verses.map((v) => ({
          bookId: book.id,
          chapter: cap.number,
          number: v.number,
          text: v.text,
        })),
      );

      // Insere em lotes para não estourar limites de parâmetros.
      const LOTE = 1000;
      for (let i = 0; i < versiculos.length; i += LOTE) {
        await prisma.bibleVerse.createMany({
          data: versiculos.slice(i, i + LOTE),
        });
      }
      totalVersiculos += versiculos.length;
      process.stdout.write(".");
    }

    console.log(
      `\n✅ ${biblia.name} importada: ${biblia.books.length} livros, ${totalVersiculos} versículos.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Falha na importação da Bíblia:", e);
  process.exit(1);
});
