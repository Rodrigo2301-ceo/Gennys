import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { prisma } from "@/lib/prisma";
import { ApiError, RateLimitError } from "./errors";

export interface RateLimitPolicy {
  action: string;
  limit: number;
  windowMs: number;
}

type HeaderRecord = Record<string, string | string[] | undefined>;
export type HeaderSource = Headers | HeaderRecord;

interface RateLimitClient {
  deleteMany(args: {
    where: {
      identifierHash: string;
      action: string;
      expiresAt: { lt: Date };
    };
  }): Promise<unknown>;
  upsert(args: {
    where: {
      identifierHash_action_windowStart: {
        identifierHash: string;
        action: string;
        windowStart: Date;
      };
    };
    create: {
      identifierHash: string;
      action: string;
      windowStart: Date;
      expiresAt: Date;
      count: number;
    };
    update: {
      count: { increment: number };
      expiresAt: Date;
    };
    select: { count: true };
  }): Promise<{ count: number }>;
}

function readHeader(
  headers: HeaderSource | undefined,
  name: string,
): string | null {
  if (!headers) return null;
  if (headers instanceof Headers) return headers.get(name);
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function normalizeIpCandidate(value: string): string | null {
  let candidate = value.split(",", 1)[0]?.trim().toLowerCase() ?? "";
  if (candidate.startsWith("[")) {
    const end = candidate.indexOf("]");
    candidate = end > 0 ? candidate.slice(1, end) : "";
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
    candidate = candidate.replace(/:\d+$/, "");
  }
  return isIP(candidate) ? candidate : null;
}

export function clientIpFromHeaders(headers?: HeaderSource): string {
  const candidates = [
    readHeader(headers, "x-vercel-forwarded-for"),
    readHeader(headers, "x-forwarded-for"),
    readHeader(headers, "x-real-ip"),
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const ip = normalizeIpCandidate(raw);
    if (ip) return ip;
  }
  return "unknown";
}

function getHmacSecret(): string {
  const secret =
    process.env.SECURITY_HMAC_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new ApiError(
      503,
      "SECURITY_CONFIG_UNAVAILABLE",
      "Proteção temporariamente indisponível.",
    );
  }
  return secret;
}

export function deriveIdentifierHash(
  kind: "ip" | "user" | "credential",
  identifier: string,
  secret = getHmacSecret(),
): string {
  if (!identifier || identifier.length > 1_024) {
    throw new ApiError(400, "INVALID_RATE_LIMIT_KEY", "Identificador inválido.");
  }
  return createHmac("sha256", secret)
    .update(`gennys-rate-limit:v1\0${kind}\0${identifier}`)
    .digest("hex");
}

function validatePolicy(policy: RateLimitPolicy): void {
  if (
    !/^[a-z0-9:_-]{1,64}$/.test(policy.action) ||
    !Number.isSafeInteger(policy.limit) ||
    policy.limit < 1 ||
    policy.limit > 100_000 ||
    !Number.isSafeInteger(policy.windowMs) ||
    policy.windowMs < 1_000 ||
    policy.windowMs > 31 * 24 * 60 * 60 * 1_000
  ) {
    throw new ApiError(
      503,
      "INVALID_RATE_LIMIT_POLICY",
      "Proteção temporariamente indisponível.",
    );
  }
}

export async function consumeRateLimit(
  identifierHash: string,
  policy: RateLimitPolicy,
  options: { now?: Date; client?: RateLimitClient } = {},
): Promise<{ remaining: number; retryAfterSeconds: number }> {
  validatePolicy(policy);
  if (!/^[a-f0-9]{64}$/.test(identifierHash)) {
    throw new ApiError(
      503,
      "INVALID_RATE_LIMIT_HASH",
      "Proteção temporariamente indisponível.",
    );
  }

  const now = options.now ?? new Date();
  const windowStartMs = Math.floor(now.getTime() / policy.windowMs) * policy.windowMs;
  const windowStart = new Date(windowStartMs);
  const windowEndMs = windowStartMs + policy.windowMs;
  const expiresAt = new Date(windowEndMs);
  const client =
    options.client ?? (prisma.rateLimit as unknown as RateLimitClient);

  // Mantém o armazenamento limitado sem apagar buckets de outros usuários.
  await client.deleteMany({
    where: {
      identifierHash,
      action: policy.action,
      expiresAt: { lt: now },
    },
  });

  // O incremento do upsert é uma única operação atômica no PostgreSQL.
  const bucket = await client.upsert({
    where: {
      identifierHash_action_windowStart: {
        identifierHash,
        action: policy.action,
        windowStart,
      },
    },
    create: {
      identifierHash,
      action: policy.action,
      windowStart,
      expiresAt,
      count: 1,
    },
    update: { count: { increment: 1 }, expiresAt },
    select: { count: true },
  });

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowEndMs - now.getTime()) / 1_000),
  );
  if (bucket.count > policy.limit) {
    throw new RateLimitError(retryAfterSeconds);
  }
  return {
    remaining: Math.max(0, policy.limit - bucket.count),
    retryAfterSeconds,
  };
}

export async function limitByIp(
  headers: HeaderSource | undefined,
  policy: RateLimitPolicy,
): Promise<void> {
  const hash = deriveIdentifierHash("ip", clientIpFromHeaders(headers));
  await consumeRateLimit(hash, policy);
}

export async function limitByCredential(
  headers: HeaderSource | undefined,
  credential: string,
  policy: RateLimitPolicy,
): Promise<void> {
  const ip = clientIpFromHeaders(headers);
  const hash = deriveIdentifierHash(
    "credential",
    `${ip}\0${credential.trim().toLowerCase()}`,
  );
  await consumeRateLimit(hash, policy);
}

export async function limitByUser(
  userId: string,
  policy: RateLimitPolicy,
): Promise<void> {
  const hash = deriveIdentifierHash("user", userId);
  await consumeRateLimit(hash, policy);
}

export function userRateLimitHash(userId: string): string {
  return deriveIdentifierHash("user", userId);
}

export const RATE_LIMITS = {
  loginIp: { action: "auth:login:ip", limit: 20, windowMs: 15 * 60_000 },
  loginCredential: {
    action: "auth:login:credential",
    limit: 5,
    windowMs: 15 * 60_000,
  },
  register: { action: "auth:register", limit: 5, windowMs: 60 * 60_000 },
  profileRead: { action: "profile:read", limit: 120, windowMs: 60_000 },
  profileWrite: { action: "profile:write", limit: 30, windowMs: 15 * 60_000 },
  sensitiveAccount: {
    action: "account:sensitive",
    limit: 5,
    windowMs: 15 * 60_000,
  },
  accountDelete: {
    action: "account:delete",
    limit: 3,
    windowMs: 60 * 60_000,
  },
  accountExport: {
    action: "account:export",
    limit: 2,
    windowMs: 60 * 60_000,
  },
  dataRead: { action: "data:read", limit: 120, windowMs: 60_000 },
  dataWrite: { action: "data:write", limit: 60, windowMs: 60_000 },
  bibleRead: { action: "bible:read", limit: 180, windowMs: 60_000 },
  bibleWrite: { action: "bible:write", limit: 60, windowMs: 60_000 },
} satisfies Record<string, RateLimitPolicy>;
