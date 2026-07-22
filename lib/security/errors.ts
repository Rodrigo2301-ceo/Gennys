import { NextResponse } from "next/server";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Expires: "0",
  Pragma: "no-cache",
} as const;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly headers?: HeadersInit;

  constructor(
    status: number,
    code: string,
    message: string,
    headers?: HeadersInit,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

export class RateLimitError extends ApiError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    const retryAfter = Math.max(1, Math.ceil(retryAfterSeconds));
    super(
      429,
      "RATE_LIMITED",
      "Muitas tentativas. Aguarde um pouco e tente novamente.",
      { "Retry-After": String(retryAfter) },
    );
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfter;
  }
}

export function jsonNoStore(
  body: unknown,
  init: ResponseInit = {},
): NextResponse {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return NextResponse.json(body, { ...init, headers });
}

export function okJson(body: unknown, status = 200): NextResponse {
  return jsonNoStore(body, { status });
}

export function errorJson(error: ApiError): NextResponse {
  return jsonNoStore(
    { error: error.message, code: error.code },
    { status: error.status, headers: error.headers },
  );
}

function safeInternalCode(error: unknown): string {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return "UNEXPECTED_ERROR";
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[A-Z0-9_-]{1,40}$/.test(code)
    ? code
    : "UNEXPECTED_ERROR";
}

/** Registra somente metadados técnicos allowlisted, nunca o objeto de erro. */
export function logSanitizedError(event: string, error: unknown): void {
  const safeEvent = /^[a-z0-9:_-]{1,64}$/.test(event)
    ? event
    : "api:unknown";
  console.error(`[${safeEvent}] falha`, { code: safeInternalCode(error) });
}

export async function secureRoute(
  event: string,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ApiError) return errorJson(error);
    logSanitizedError(event, error);
    return errorJson(
      new ApiError(
        500,
        "INTERNAL_ERROR",
        "Não foi possível concluir a operação.",
      ),
    );
  }
}
