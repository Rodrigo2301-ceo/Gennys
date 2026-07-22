import { ProvedorIaError } from "./errors";

export const TIMEOUT_PROVEDOR_MS = 20_000;
const LIMITE_CORPO_PROVEDOR_BYTES = 256 * 1024;
const LIMITE_RESPOSTA_TEXTO = 1_200;

export function sinalTimeoutProvedor(): AbortSignal {
  return AbortSignal.timeout(TIMEOUT_PROVEDOR_MS);
}

export function converterErroProvedor(
  erro: unknown,
  signal?: AbortSignal,
): ProvedorIaError {
  if (erro instanceof ProvedorIaError) return erro;
  if (
    signal?.aborted ||
    (erro instanceof Error &&
      (erro.name === "AbortError" || erro.name === "TimeoutError"))
  ) {
    return new ProvedorIaError("falha_provedor");
  }
  return new ProvedorIaError("falha_provedor");
}

export async function lerCorpoProvedorLimitado(res: Response): Promise<string> {
  const declarado = Number(res.headers.get("content-length"));
  if (Number.isFinite(declarado) && declarado > LIMITE_CORPO_PROVEDOR_BYTES) {
    throw new ProvedorIaError("falha_provedor");
  }
  if (!res.body) throw new ProvedorIaError("falha_provedor");

  const leitor = res.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await leitor.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > LIMITE_CORPO_PROVEDOR_BYTES) {
        await leitor.cancel();
        throw new ProvedorIaError("falha_provedor");
      }
      partes.push(value);
    }
  } finally {
    leitor.releaseLock();
  }

  const combinado = new Uint8Array(total);
  let posicao = 0;
  for (const parte of partes) {
    combinado.set(parte, posicao);
    posicao += parte.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(combinado);
  } catch {
    throw new ProvedorIaError("falha_provedor");
  }
}

export function validarRespostaTexto(texto: string): string {
  const limpa = texto.trim();
  if (!limpa || limpa.length > LIMITE_RESPOSTA_TEXTO) {
    throw new ProvedorIaError("falha_provedor");
  }
  return limpa;
}
