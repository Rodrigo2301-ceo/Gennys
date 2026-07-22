import { confirmarEntrada } from "@/lib/engine/process";
import { EntradaInvalidaError } from "@/lib/engine/errors";
import type { PropostaEntrada } from "@/lib/engine/types";
import { ApiError, errorJson } from "@/lib/security/errors";
import {
  assertOnlyKeys,
  isRecord,
  parseJsonObject,
} from "@/lib/security/request";
import { requireCurrentUser } from "@/lib/security/session";
import { jsonSemCache, responderErroProcessamento } from "../responses";

const LIMITE_CORPO_CONFIRMACAO_BYTES = 32 * 1024;
const LIMITE_CONFIRMACAO = {
  action: "ai:confirm",
  limit: 30,
  windowMs: 60_000,
} as const;

export async function POST(req: Request) {
  try {
    const user = await requireCurrentUser(LIMITE_CONFIRMACAO);
    const bruto = await parseJsonObject(req, LIMITE_CORPO_CONFIRMACAO_BYTES);
    assertOnlyKeys(bruto, ["token", "proposta"]);
    if (typeof bruto.token !== "string" || !isRecord(bruto.proposta)) {
      throw new EntradaInvalidaError("Confirmação inválida.");
    }
    const resultado = await confirmarEntrada({
      userId: user.id,
      token: bruto.token,
      proposta: bruto.proposta as unknown as PropostaEntrada,
    });
    return jsonSemCache(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ApiError) return errorJson(error);
    return responderErroProcessamento(error);
  }
}
