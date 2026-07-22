import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import {
  ConfiguracaoConfirmacaoError,
  ConfirmacaoInvalidaError,
} from "@/lib/engine/errors";
import { validarPropostaEntrada } from "@/lib/engine/parseCategorizacao";
import type {
  ContextoConfirmacaoIa,
  JsonValue,
  PropostaEntrada,
} from "@/lib/engine/types";

const VERSAO_TOKEN = 1;
export const DURACAO_TOKEN_CONFIRMACAO_SEGUNDOS = 10 * 60;
const LIMITE_TOKEN_CARACTERES = 2_048;

interface TokenPayload {
  ver: number;
  sub: string;
  proposal: string;
  provider: ContextoConfirmacaoIa["provider"];
  consentVersion: string;
  purpose: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

export interface TokenConfirmacaoCriado {
  token: string;
  expiresAt: Date;
}

function segredoHmac(): Buffer {
  const valor =
    process.env.SECURITY_HMAC_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (!valor || Buffer.byteLength(valor, "utf8") < 32) {
    throw new ConfiguracaoConfirmacaoError();
  }
  return Buffer.from(valor, "utf8");
}

export function garantirConfiguracaoConfirmacao(): void {
  void segredoHmac();
}

function hmac(rotulo: string, valor: string): string {
  return createHmac("sha256", segredoHmac())
    .update(rotulo)
    .update("\0")
    .update(valor)
    .digest("base64url");
}

function serializarCanonico(valor: JsonValue): string {
  if (valor === null || typeof valor !== "object") return JSON.stringify(valor);
  if (Array.isArray(valor)) {
    return `[${valor.map((item) => serializarCanonico(item)).join(",")}]`;
  }
  return `{${Object.keys(valor)
    .sort()
    .map(
      (chave) =>
        `${JSON.stringify(chave)}:${serializarCanonico(valor[chave])}`,
    )
    .join(",")}}`;
}

function hashProposta(proposta: PropostaEntrada): string {
  return hmac("proposal", serializarCanonico(proposta as unknown as JsonValue));
}

function hashUsuario(userId: string): string {
  return hmac("subject", userId);
}

function assinatura(payloadCodificado: string): Buffer {
  return createHmac("sha256", segredoHmac())
    .update("confirmation-token\0")
    .update(payloadCodificado)
    .digest();
}

function ehPayload(valor: unknown): valor is TokenPayload {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) return false;
  const payload = valor as Record<string, unknown>;
  const esperadas = [
    "ver",
    "sub",
    "proposal",
    "provider",
    "consentVersion",
    "purpose",
    "issuedAt",
    "expiresAt",
    "nonce",
  ];
  if (
    Object.keys(payload).length !== esperadas.length ||
    esperadas.some((chave) => !(chave in payload))
  ) {
    return false;
  }
  return (
    payload.ver === VERSAO_TOKEN &&
    typeof payload.sub === "string" &&
    typeof payload.proposal === "string" &&
    (payload.provider === "gemini" ||
      payload.provider === "groq" ||
      payload.provider === "anthropic") &&
    typeof payload.consentVersion === "string" &&
    typeof payload.purpose === "string" &&
    typeof payload.issuedAt === "number" &&
    Number.isSafeInteger(payload.issuedAt) &&
    typeof payload.expiresAt === "number" &&
    Number.isSafeInteger(payload.expiresAt) &&
    typeof payload.nonce === "string" &&
    payload.nonce.length >= 20
  );
}

export function criarTokenConfirmacao(
  userId: string,
  propostaBruta: PropostaEntrada,
  contexto: ContextoConfirmacaoIa,
  agora = new Date(),
): TokenConfirmacaoCriado {
  const proposta = validarPropostaEntrada(propostaBruta);
  const issuedAt = Math.floor(agora.getTime() / 1000);
  const expiresAt = issuedAt + DURACAO_TOKEN_CONFIRMACAO_SEGUNDOS;
  const payload: TokenPayload = {
    ver: VERSAO_TOKEN,
    sub: hashUsuario(userId),
    proposal: hashProposta(proposta),
    provider: contexto.provider,
    consentVersion: contexto.consentVersion,
    purpose: contexto.purpose,
    issuedAt,
    expiresAt,
    nonce: randomBytes(18).toString("base64url"),
  };
  const payloadCodificado = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const token = `${payloadCodificado}.${assinatura(payloadCodificado).toString("base64url")}`;
  return { token, expiresAt: new Date(expiresAt * 1000) };
}

export function verificarTokenConfirmacao(
  token: string,
  userId: string,
  propostaBruta: PropostaEntrada,
  agora = new Date(),
): { contexto: ContextoConfirmacaoIa; expiresAt: Date } {
  if (!token || token.length > LIMITE_TOKEN_CARACTERES) {
    throw new ConfirmacaoInvalidaError();
  }
  const partes = token.split(".");
  if (partes.length !== 2 || !partes[0] || !partes[1]) {
    throw new ConfirmacaoInvalidaError();
  }

  let recebida: Buffer;
  let payload: unknown;
  try {
    recebida = Buffer.from(partes[1], "base64url");
    payload = JSON.parse(Buffer.from(partes[0], "base64url").toString("utf8"));
  } catch {
    throw new ConfirmacaoInvalidaError();
  }
  const esperada = assinatura(partes[0]);
  if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada)) {
    throw new ConfirmacaoInvalidaError();
  }
  if (!ehPayload(payload)) throw new ConfirmacaoInvalidaError();

  const agoraSegundos = Math.floor(agora.getTime() / 1000);
  const proposta = validarPropostaEntrada(propostaBruta);
  if (
    payload.sub !== hashUsuario(userId) ||
    payload.proposal !== hashProposta(proposta) ||
    payload.expiresAt <= agoraSegundos ||
    payload.issuedAt > agoraSegundos + 30 ||
    payload.expiresAt - payload.issuedAt !== DURACAO_TOKEN_CONFIRMACAO_SEGUNDOS
  ) {
    throw new ConfirmacaoInvalidaError();
  }

  return {
    contexto: {
      provider: payload.provider,
      consentVersion: payload.consentVersion,
      purpose: payload.purpose,
    },
    expiresAt: new Date(payload.expiresAt * 1000),
  };
}

export function hashTokenConfirmacao(token: string): string {
  if (!token || token.length > LIMITE_TOKEN_CARACTERES) {
    throw new ConfirmacaoInvalidaError();
  }
  return hmac("receipt", token);
}
