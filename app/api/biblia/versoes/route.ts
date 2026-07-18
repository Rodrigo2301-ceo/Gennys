import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Lista as traduções disponíveis (seletor de versão).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const versoes = await prisma.bibleTranslation.findMany({
    select: { code: true, name: true, year: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ versoes });
}
