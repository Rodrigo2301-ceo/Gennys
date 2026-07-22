import { EntradaInvalidaError } from "./errors";
import type { EntradaMotor, ImagemEntrada, TurnoHistorico } from "./types";

export const LIMITE_TEXTO_ENTRADA = 4_000;
export const LIMITE_TURNOS_HISTORICO = 8;
export const LIMITE_TEXTO_TURNO = 2_000;
export const LIMITE_TOTAL_HISTORICO = 8_000;
export const LIMITE_IMAGEM_BYTES = 5 * 1024 * 1024;
export const LIMITE_CORPO_PROCESSO_BYTES = 8 * 1024 * 1024;

const MIME_PERMITIDOS = new Set<ImagemEntrada["mediaType"]>([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function ehObjetoSimples(valor: unknown): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor) &&
    (Object.getPrototypeOf(valor) === Object.prototype ||
      Object.getPrototypeOf(valor) === null)
  );
}

function somenteChaves(
  objeto: Record<string, unknown>,
  permitidas: readonly string[],
): boolean {
  return Object.keys(objeto).every((chave) => permitidas.includes(chave));
}

function assinaturaConfere(
  bytes: Buffer,
  mediaType: ImagemEntrada["mediaType"],
): boolean {
  switch (mediaType) {
    case "image/jpeg":
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return (
        bytes.length >= 8 &&
        bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      );
    case "image/gif": {
      const cabecalho = bytes.subarray(0, 6).toString("ascii");
      return cabecalho === "GIF87a" || cabecalho === "GIF89a";
    }
    case "image/webp":
      return (
        bytes.length >= 12 &&
        bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
        bytes.subarray(8, 12).toString("ascii") === "WEBP"
      );
  }
}

function validarImagem(valor: unknown): ImagemEntrada {
  if (!ehObjetoSimples(valor) || !somenteChaves(valor, ["base64", "mediaType"])) {
    throw new EntradaInvalidaError("Imagem invalida.");
  }
  if (
    typeof valor.base64 !== "string" ||
    typeof valor.mediaType !== "string" ||
    !MIME_PERMITIDOS.has(valor.mediaType as ImagemEntrada["mediaType"])
  ) {
    throw new EntradaInvalidaError("Imagem invalida.");
  }

  const base64 = valor.base64;
  if (
    base64.length === 0 ||
    base64.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)
  ) {
    throw new EntradaInvalidaError("Imagem invalida.");
  }

  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0 || bytes.length > LIMITE_IMAGEM_BYTES) {
    throw new EntradaInvalidaError("Imagem muito grande.", 413);
  }
  if (bytes.toString("base64") !== base64 || !assinaturaConfere(bytes, valor.mediaType as ImagemEntrada["mediaType"])) {
    throw new EntradaInvalidaError("Imagem invalida.");
  }

  return {
    base64,
    mediaType: valor.mediaType as ImagemEntrada["mediaType"],
  };
}

function validarHistorico(valor: unknown): TurnoHistorico[] | undefined {
  if (valor === undefined) return undefined;
  if (!Array.isArray(valor) || valor.length > LIMITE_TURNOS_HISTORICO) {
    throw new EntradaInvalidaError("Historico invalido.");
  }

  let total = 0;
  const historico = valor.map((turno): TurnoHistorico => {
    if (!ehObjetoSimples(turno) || !somenteChaves(turno, ["autor", "texto"])) {
      throw new EntradaInvalidaError("Historico invalido.");
    }
    if (
      (turno.autor !== "usuario" && turno.autor !== "gennys") ||
      typeof turno.texto !== "string"
    ) {
      throw new EntradaInvalidaError("Historico invalido.");
    }
    const texto = turno.texto.trim();
    if (!texto || texto.length > LIMITE_TEXTO_TURNO) {
      throw new EntradaInvalidaError("Historico invalido.");
    }
    total += texto.length;
    return { autor: turno.autor, texto };
  });

  if (total > LIMITE_TOTAL_HISTORICO) {
    throw new EntradaInvalidaError("Historico muito grande.", 413);
  }
  return historico;
}

export function validarEntradaMotor(userId: string, bruto: unknown): EntradaMotor {
  if (!ehObjetoSimples(bruto) || !somenteChaves(bruto, ["texto", "imagem", "historico"])) {
    throw new EntradaInvalidaError("Entrada invalida.");
  }

  let texto: string | undefined;
  if (bruto.texto !== undefined) {
    if (typeof bruto.texto !== "string") {
      throw new EntradaInvalidaError("Texto invalido.");
    }
    texto = bruto.texto.trim();
    if (texto.length > LIMITE_TEXTO_ENTRADA) {
      throw new EntradaInvalidaError("Texto muito grande.", 413);
    }
    if (!texto) texto = undefined;
  }

  const imagem = bruto.imagem === undefined ? undefined : validarImagem(bruto.imagem);
  const historico = validarHistorico(bruto.historico);
  if (!texto && !imagem) {
    throw new EntradaInvalidaError("Envie um texto ou uma imagem.");
  }

  return { userId, texto, imagem, historico };
}
