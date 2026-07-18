import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { processarEntrada } from "@/lib/engine/process";
import type { ImagemEntrada, TurnoHistorico } from "@/lib/engine/types";

const MIME_PERMITIDOS = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_BASE64 = 7 * 1024 * 1024; // ~5MB de imagem em base64

export async function POST(req: Request) {
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

  const { texto, imagem, historico } = (body ?? {}) as {
    texto?: string;
    imagem?: ImagemEntrada;
    historico?: TurnoHistorico[];
  };

  let imagemLimpa: ImagemEntrada | undefined;
  if (imagem) {
    if (
      typeof imagem.base64 !== "string" ||
      !MIME_PERMITIDOS.includes(imagem.mediaType)
    ) {
      return NextResponse.json(
        { error: "Imagem em formato não suportado." },
        { status: 400 },
      );
    }
    if (imagem.base64.length > MAX_BASE64) {
      return NextResponse.json(
        { error: "Imagem muito grande (máx. ~5MB)." },
        { status: 413 },
      );
    }
    imagemLimpa = imagem;
  }

  const historicoLimpo = Array.isArray(historico)
    ? historico
        .filter(
          (t) =>
            t &&
            (t.autor === "usuario" || t.autor === "gennys") &&
            typeof t.texto === "string",
        )
        .slice(-8)
    : undefined;

  const resultado = await processarEntrada({
    userId: session.user.id,
    texto: typeof texto === "string" ? texto : undefined,
    imagem: imagemLimpa,
    historico: historicoLimpo,
  });

  const codigo = resultado.status === "erro" ? 422 : 200;
  return NextResponse.json(resultado, { status: codigo });
}
