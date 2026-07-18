import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Alternar a trava é sempre permitido (é o único jeito de destravar).
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const entry = await prisma.entry.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!entry) {
    return NextResponse.json(
      { error: "Registro não encontrado." },
      { status: 404 },
    );
  }

  const atualizado = await prisma.entry.update({
    where: { id: entry.id },
    data: { locked: !entry.locked },
  });

  return NextResponse.json({ entry: atualizado });
}
