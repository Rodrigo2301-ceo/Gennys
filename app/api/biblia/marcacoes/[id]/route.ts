import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function marcacaoDoUsuario(id: string, userId: string) {
  return prisma.verseMark.findFirst({ where: { id, userId } });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const existente = await marcacaoDoUsuario(params.id, session.user.id);
  if (!existente) {
    return NextResponse.json(
      { error: "Marcação não encontrada." },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const { cor, observacao } = (body ?? {}) as {
    cor?: string;
    observacao?: string | null;
  };

  const marcacao = await prisma.verseMark.update({
    where: { id: existente.id },
    data: {
      cor: cor !== undefined ? cor : undefined,
      observacao:
        observacao !== undefined ? observacao?.trim() || null : undefined,
    },
  });

  return NextResponse.json({ marcacao });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const existente = await marcacaoDoUsuario(params.id, session.user.id);
  if (!existente) {
    return NextResponse.json(
      { error: "Marcação não encontrada." },
      { status: 404 },
    );
  }

  await prisma.verseMark.delete({ where: { id: existente.id } });
  return NextResponse.json({ ok: true });
}
