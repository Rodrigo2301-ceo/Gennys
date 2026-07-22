import { ApiError } from "./errors";
import { isRecord } from "./request";

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function invalid(message: string, code = "INVALID_INPUT"): never {
  throw new ApiError(400, code, message);
}

export function parseId(value: unknown, label = "ID"): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    invalid(`${label} inválido.`, "INVALID_ID");
  }
  return value;
}

export function parseRequiredText(
  value: unknown,
  options: { label: string; max: number; min?: number },
): string {
  if (typeof value !== "string") invalid(`${options.label} inválido.`);
  const result = value.trim();
  const min = options.min ?? 1;
  if (result.length < min || result.length > options.max || result.includes("\0")) {
    invalid(`${options.label} deve ter entre ${min} e ${options.max} caracteres.`);
  }
  return result;
}

export function parseOptionalNullableText(
  value: unknown,
  options: { label: string; max: number },
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") invalid(`${options.label} inválido.`);
  const result = value.trim();
  if (!result) return null;
  if (result.length > options.max || result.includes("\0")) {
    invalid(`${options.label} deve ter no máximo ${options.max} caracteres.`);
  }
  return result;
}

export function parseEmail(value: unknown): string {
  if (typeof value !== "string") invalid("E-mail inválido.", "INVALID_EMAIL");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email) || email.includes("\0")) {
    invalid("E-mail inválido.", "INVALID_EMAIL");
  }
  return email;
}

export function parseNewPassword(value: unknown): string {
  if (typeof value !== "string") invalid("Senha inválida.", "INVALID_PASSWORD");
  const bytes = Buffer.byteLength(value, "utf8");
  if (value.length < 8 || bytes > 72 || value.includes("\0")) {
    invalid(
      "A senha deve ter ao menos 8 caracteres e no máximo 72 bytes.",
      "INVALID_PASSWORD",
    );
  }
  return value;
}

export function parseCurrentPassword(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    Buffer.byteLength(value, "utf8") > 1024 ||
    value.includes("\0")
  ) {
    invalid("Senha atual inválida.", "INVALID_PASSWORD");
  }
  return value;
}

function parseCivilParts(value: unknown): {
  value: string;
  year: number;
  month: number;
  day: number;
} {
  if (typeof value !== "string") invalid("Data inválida.", "INVALID_DATE");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) invalid("Data inválida.", "INVALID_DATE");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    invalid("Data inválida.", "INVALID_DATE");
  }
  return { value, year, month, day };
}

export function parseCivilDate(value: unknown): string {
  return parseCivilParts(value).value;
}

function todayCivilSaoPaulo(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function parseBirthDateCivil(value: unknown): string {
  const parsed = parseCivilParts(value);
  if (parsed.year < 1900 || parsed.value > todayCivilSaoPaulo()) {
    invalid("Data de nascimento inválida.", "INVALID_BIRTH_DATE");
  }
  return parsed.value;
}

/** Meio-dia UTC preserva a data civil também no fuso America/Sao_Paulo. */
export function civilDateToLegacyDate(value: string): Date {
  const { year, month, day } = parseCivilParts(value);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function legacyDateToCivil(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function parseReferenceMonth(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    invalid("Mês de referência inválido.", "INVALID_REFERENCE_MONTH");
  }
  return value;
}

export function parseBoundedCode(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9_-]{1,20}$/.test(value)
  ) {
    invalid(`${label} inválido.`);
  }
  return value;
}

export function parsePositiveInteger(
  value: unknown,
  label: string,
  max: number,
): number {
  const number =
    typeof value === "string" && /^[1-9]\d*$/.test(value)
      ? Number(value)
      : value;
  if (
    typeof number !== "number" ||
    !Number.isSafeInteger(number) ||
    number < 1 ||
    number > max
  ) {
    invalid(`${label} inválido.`);
  }
  return number;
}

const HIGHLIGHT_COLORS = new Set([
  "#93c5fd",
  "#67e8f9",
  "#f59e0b",
  "#14b8a6",
  "#f472b6",
]);

export function parseHighlightColor(value: unknown): string {
  if (typeof value !== "string" || !HIGHLIGHT_COLORS.has(value.toLowerCase())) {
    invalid("Cor inválida.", "INVALID_COLOR");
  }
  return value.toLowerCase();
}

export function parseEnum<const T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    invalid(`${label} inválido.`);
  }
  return value as T;
}

export function parseMoney(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    invalid("Valor inválido.", "INVALID_AMOUNT");
  }
  const cents = Math.round(value * 100);
  if (
    value < 0 ||
    value > 999_999_999_999.99 ||
    !Number.isSafeInteger(cents) ||
    Math.abs(cents / 100 - value) > Number.EPSILON * Math.max(1, value)
  ) {
    invalid("Valor inválido.", "INVALID_AMOUNT");
  }
  return value;
}

function validateJsonNode(
  value: unknown,
  depth: number,
  state: { nodes: number },
): void {
  state.nodes++;
  if (state.nodes > 500 || depth > 8) invalid("Dados muito complexos.");
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
      invalid("Dados contêm número inválido.");
    }
    return;
  }
  if (typeof value === "string") {
    if (value.length > 4_000 || value.includes("\0")) invalid("Texto em dados muito grande.");
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 100) invalid("Lista em dados muito grande.");
    for (const item of value) validateJsonNode(item, depth + 1, state);
    return;
  }
  if (!isRecord(value)) invalid("Dados inválidos.");
  const entries = Object.entries(value);
  if (entries.length > 100) invalid("Dados contêm campos demais.");
  for (const [key, item] of entries) {
    if (
      key.length > 80 ||
      key === "__proto__" ||
      key === "prototype" ||
      key === "constructor"
    ) {
      invalid("Dados contêm campo inválido.");
    }
    validateJsonNode(item, depth + 1, state);
  }
}

export function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) invalid("Dados devem ser um objeto.");
  validateJsonNode(value, 0, { nodes: 0 });
  return value;
}
