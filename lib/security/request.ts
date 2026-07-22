import { ApiError } from "./errors";

const JSON_CONTENT_TYPES = new Set(["application/json"]);

function allowedOrigins(req: Request): Set<string> {
  const url = new URL(req.url);
  const allowed = new Set([url.origin]);
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = req.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  if (forwardedHost && /^(https?|http)$/i.test(forwardedProto ?? "")) {
    try {
      allowed.add(new URL(`${forwardedProto}://${forwardedHost}`).origin);
    } catch {
      // Cabeçalhos inválidos não ampliam a allowlist.
    }
  }
  return allowed;
}

export function assertTrustedMutation(req: Request): void {
  if (req.headers.get("sec-fetch-site") === "cross-site") {
    throw new ApiError(403, "CROSS_SITE_REQUEST", "Origem não permitida.");
  }

  const origin = req.headers.get("origin");
  if (!origin) return; // Clientes não-browser não enviam Origin.

  let normalized: string;
  try {
    normalized = new URL(origin).origin;
  } catch {
    throw new ApiError(403, "INVALID_ORIGIN", "Origem não permitida.");
  }
  if (!allowedOrigins(req).has(normalized)) {
    throw new ApiError(403, "INVALID_ORIGIN", "Origem não permitida.");
  }
}

function assertJsonContentType(req: Request): void {
  const raw = req.headers.get("content-type") ?? "";
  const mime = raw.split(";", 1)[0].trim().toLowerCase();
  if (!JSON_CONTENT_TYPES.has(mime) && !mime.endsWith("+json")) {
    throw new ApiError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Envie o corpo como application/json.",
    );
  }
}

async function readUtf8Body(req: Request, maxBytes: number): Promise<string> {
  const declaredLength = req.headers.get("content-length");
  if (declaredLength !== null) {
    const value = Number(declaredLength);
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new ApiError(400, "INVALID_CONTENT_LENGTH", "Corpo inválido.");
    }
    if (value > maxBytes) {
      throw new ApiError(413, "BODY_TOO_LARGE", "Corpo muito grande.");
    }
  }

  if (!req.body) {
    throw new ApiError(400, "EMPTY_BODY", "Corpo inválido.");
  }

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new ApiError(413, "BODY_TOO_LARGE", "Corpo muito grande.");
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(merged);
  } catch {
    throw new ApiError(400, "INVALID_UTF8", "Corpo inválido.");
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

export async function parseJsonObject(
  req: Request,
  maxBytes: number,
): Promise<Record<string, unknown>> {
  assertTrustedMutation(req);
  assertJsonContentType(req);
  const raw = await readUtf8Body(req, maxBytes);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Corpo inválido.");
  }
  if (!isRecord(parsed)) {
    throw new ApiError(400, "INVALID_BODY", "O corpo deve ser um objeto JSON.");
  }
  return parsed;
}

export function assertOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): void {
  const allowlist = new Set(allowed);
  if (Object.keys(value).some((key) => !allowlist.has(key))) {
    throw new ApiError(400, "UNKNOWN_FIELD", "O corpo contém campos inválidos.");
  }
}
