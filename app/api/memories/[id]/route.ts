import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const memory = await prisma.memory.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!memory) {
    return NextResponse.json(
      { error: "Memória não encontrada." },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const { fato, categoria } = (body ?? {}) as {
    fato?: string;
    categoria?: string | null;
  };
  if (fato !== undefined && !fato.trim()) {
    return NextResponse.json(
      { error: "O fato não pode ficar vazio." },
      { status: 400 },
    );
  }

  const atualizado = await prisma.memory.update({
    where: { id: memory.id },
    data: {
      fato: fato !== undefined ? fato.trim() : undefined,
      categoria: categoria !== undefined ? categoria : undefined,
    },
  });

  return NextResponse.json({ memory: atualizado });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const memory = await prisma.memory.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!memory) {
    return NextResponse.json(
      { error: "Memória não encontrada." },
      { status: 404 },
    );
  }

  await prisma.memory.delete({ where: { id: memory.id } });
  return NextResponse.json({ ok: true });
}
