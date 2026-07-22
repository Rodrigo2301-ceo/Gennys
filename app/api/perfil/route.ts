import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";

// Perfil da própria conta. GET devolve os dados; PATCH edita.
// Trocas sensíveis (e-mail e senha) exigem a senha atual (re-autenticação).

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      birthDate: true,
      plan: true,
      aiProvider: true,
      createdAt: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
  }
  return NextResponse.json({ perfil: user });
}

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

  const { name, birthDate, email, novaSenha, senhaAtual } = (body ?? {}) as {
    name?: string;
    birthDate?: string | null;
    email?: string;
    novaSenha?: string;
    senhaAtual?: string;
  };

  const emailLimpo = typeof email === "string" ? email.trim().toLowerCase() : "";
  const querTrocarEmail = emailLimpo.length > 0;
  const querTrocarSenha = typeof novaSenha === "string" && novaSenha.length > 0;

  const data: Prisma.UserUpdateInput = {};

  // Nome (livre, sem senha)
  if (typeof name === "string") {
    const nomeLimpo = name.trim();
    if (!nomeLimpo) {
      return NextResponse.json({ error: "O nome não pode ficar vazio." }, { status: 400 });
    }
    data.name = nomeLimpo;
  }

  // Data de nascimento (livre, sem senha)
  if (birthDate !== undefined) {
    if (birthDate === null || birthDate === "") {
      data.birthDate = null;
    } else {
      const d = new Date(birthDate);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Data de nascimento inválida." }, { status: 400 });
      }
      data.birthDate = d;
    }
  }

  // Trocas sensíveis exigem a senha atual
  if (querTrocarEmail || querTrocarSenha) {
    if (!senhaAtual) {
      return NextResponse.json(
        { error: "Confirme sua senha atual para alterar e-mail ou senha." },
        { status: 400 },
      );
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
    }
    const ok = await bcrypt.compare(senhaAtual, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Senha atual incorreta." }, { status: 403 });
    }

    if (querTrocarEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
        return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
      }
      const existente = await prisma.user.findUnique({
        where: { email: emailLimpo },
        select: { id: true },
      });
      if (existente && existente.id !== session.user.id) {
        return NextResponse.json(
          { error: "Já existe uma conta com esse e-mail." },
          { status: 409 },
        );
      }
      data.email = emailLimpo;
    }

    if (querTrocarSenha) {
      if (novaSenha!.length < 6) {
        return NextResponse.json(
          { error: "A nova senha precisa ter ao menos 6 caracteres." },
          { status: 400 },
        );
      }
      data.passwordHash = await bcrypt.hash(novaSenha!, 10);
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  try {
    const atualizado = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
        name: true,
        email: true,
        birthDate: true,
        plan: true,
        aiProvider: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ ok: true, perfil: atualizado });
  } catch (err) {
    console.error("[perfil] erro ao atualizar:", err);
    return NextResponse.json(
      { error: "Não foi possível salvar. Tente novamente." },
      { status: 500 },
    );
  }
}
