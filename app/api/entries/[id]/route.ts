import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";

async function buscarEntryDoUsuario(id: string, userId: string) {
  return prisma.entry.findFirst({ where: { id, userId } });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const entry = await buscarEntryDoUsuario(params.id, session.user.id);
  if (!entry) {
    return NextResponse.json(
      { error: "Registro não encontrado." },
      { status: 404 },
    );
  }
  if (entry.locked) {
    return NextResponse.json(
      { error: "Registro travado. Destrave para editar." },
      { status: 423 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const { categoria, valor, dados } = (body ?? {}) as {
    categoria?: string | null;
    valor?: number | null;
    dados?: Record<string, unknown>;
  };

  const atualizado = await prisma.entry.update({
    where: { id: entry.id },
    data: {
      categoria: categoria !== undefined ? categoria : undefined,
      valor: valor !== undefined ? valor : undefined,
      dados:
        dados !== undefined
          ? (dados as Prisma.InputJsonValue)
          : undefined,
    },
  });

  return NextResponse.json({ entry: atualizado });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const entry = await buscarEntryDoUsuario(params.id, session.user.id);
  if (!entry) {
    return NextResponse.json(
      { error: "Registro não encontrado." },
      { status: 404 },
    );
  }
  if (entry.locked) {
    return NextResponse.json(
      { error: "Registro travado. Destrave para excluir." },
      { status: 423 },
    );
  }

  await prisma.entry.delete({ where: { id: entry.id } });
  return NextResponse.json({ ok: true });
}
