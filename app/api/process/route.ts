import {
  LIMITE_CORPO_PROCESSO_BYTES,
  validarEntradaMotor,
} from "@/lib/engine/inputValidation";
import { processarEntrada } from "@/lib/engine/process";
import { ApiError, errorJson } from "@/lib/security/errors";
import { parseJsonObject } from "@/lib/security/request";
import { requireCurrentUser } from "@/lib/security/session";
import { jsonSemCache, responderErroProcessamento } from "./responses";

const LIMITE_PROCESSAMENTO = {
  action: "ai:process",
  limit: 12,
  windowMs: 60_000,
} as const;

export async function POST(req: Request) {
  try {
    const user = await requireCurrentUser(LIMITE_PROCESSAMENTO);
    const bruto = await parseJsonObject(req, LIMITE_CORPO_PROCESSO_BYTES);
    const entrada = validarEntradaMotor(user.id, bruto);
    const resultado = await processarEntrada(entrada);
    return jsonSemCache(resultado, { status: 200 });
  } catch (error) {
    if (error instanceof ApiError) return errorJson(error);
    return responderErroProcessamento(error);
  }
}
