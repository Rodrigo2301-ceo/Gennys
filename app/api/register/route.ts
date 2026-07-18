import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const { nome, email, senha, dataNascimento } = (body ?? {}) as {
    nome?: string;
    email?: string;
    senha?: string;
    dataNascimento?: string;
  };

  const nomeLimpo = nome?.trim();
  const emailLimpo = email?.trim().toLowerCase();

  if (!nomeLimpo || !emailLimpo || !senha) {
    return NextResponse.json(
      { error: "Nome, e-mail e senha são obrigatórios." },
      { status: 400 },
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }
  if (senha.length < 6) {
    return NextResponse.json(
      { error: "A senha precisa ter ao menos 6 caracteres." },
      { status: 400 },
    );
  }

  let birthDate: Date | null = null;
  if (dataNascimento) {
    const d = new Date(dataNascimento);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json(
        { error: "Data de nascimento inválida." },
        { status: 400 },
      );
    }
    birthDate = d;
  }

  try {
    const existente = await prisma.user.findUnique({
      where: { email: emailLimpo },
      select: { id: true },
    });
    if (existente) {
      return NextResponse.json(
        { error: "Já existe uma conta com esse e-mail." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(senha, 10);

    await prisma.user.create({
      data: {
        name: nomeLimpo,
        email: emailLimpo,
        passwordHash,
        birthDate,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[register] erro ao criar conta:", err);
    return NextResponse.json(
      { error: "Não foi possível criar a conta. Tente novamente em instantes." },
      { status: 500 },
    );
  }
}
