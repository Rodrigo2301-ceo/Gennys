import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ehProvedorValido } from "@/lib/ai/providers";

// Troca do provedor de IA ("cérebro") escolhido pelo usuário.
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const { aiProvider } = (body ?? {}) as { aiProvider?: unknown };
  if (!ehProvedorValido(aiProvider)) {
    return NextResponse.json({ error: "Provedor de IA inválido." }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { aiProvider },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[conta] erro ao trocar provedor de IA:", err);
    return NextResponse.json(
      { error: "Não foi possível salvar. Tente novamente." },
      { status: 500 },
    );
  }
}

// Exclusão de conta (LGPD — direito à eliminação). Ação irreversível:
// exige a senha atual (re-autenticação) e apaga o User. O onDelete: Cascade
// remove TUDO junto (Entries, Memories, marcações da Bíblia, uso de IA).
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  const { senha } = (body ?? {}) as { senha?: string };
  if (!senha) {
    return NextResponse.json(
      { error: "Confirme sua senha para excluir a conta." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
  }

  const ok = await bcrypt.compare(senha, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 403 });
  }

  // Cascade apaga todos os dados do usuário.
  await prisma.user.delete({ where: { id: user.id } });

  return NextResponse.json({ ok: true });
}
