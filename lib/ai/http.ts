export class CorpoRequisicaoInvalidoError extends Error {
  constructor(
    public readonly status: 400 | 413,
    message: string,
  ) {
    super(message);
    this.name = "CorpoRequisicaoInvalidoError";
  }
}

export async function lerJsonLimitado(
  req: Request,
  limiteBytes: number,
): Promise<unknown> {
  const tamanhoDeclarado = Number(req.headers.get("content-length"));
  if (Number.isFinite(tamanhoDeclarado) && tamanhoDeclarado > limiteBytes) {
    throw new CorpoRequisicaoInvalidoError(413, "Corpo muito grande.");
  }

  if (!req.body) {
    throw new CorpoRequisicaoInvalidoError(400, "Corpo invalido.");
  }

  const reader = req.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > limiteBytes) {
        await reader.cancel();
        throw new CorpoRequisicaoInvalidoError(413, "Corpo muito grande.");
      }
      partes.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let deslocamento = 0;
  for (const parte of partes) {
    bytes.set(parte, deslocamento);
    deslocamento += parte.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new CorpoRequisicaoInvalidoError(400, "Corpo invalido.");
  }
}
