export const FUSO_FINANCEIRO = "America/Sao_Paulo";

const DATA_CIVIL_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MES_CIVIL_RE = /^(\d{4})-(\d{2})$/;

export interface PartesDataCivil {
  ano: number;
  mes: number;
  dia: number;
}

export function parseDataCivil(valor: string): PartesDataCivil | null {
  const match = DATA_CIVIL_RE.exec(valor);
  if (!match) return null;

  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  if (ano < 1 || mes < 1 || mes > 12 || dia < 1) return null;

  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  if (dia > ultimoDia) return null;
  return { ano, mes, dia };
}

export function dataCivilValida(valor: unknown): valor is string {
  return typeof valor === "string" && parseDataCivil(valor) !== null;
}

export function parseMesCivil(
  valor: string,
): Pick<PartesDataCivil, "ano" | "mes"> | null {
  const match = MES_CIVIL_RE.exec(valor);
  if (!match) return null;
  const ano = Number(match[1]);
  const mes = Number(match[2]);
  return ano >= 1 && mes >= 1 && mes <= 12 ? { ano, mes } : null;
}

export function mesCivilValido(valor: unknown): valor is string {
  return typeof valor === "string" && parseMesCivil(valor) !== null;
}

function partesNoFuso(data: Date): PartesDataCivil {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_FINANCEIRO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    Number(partes.find((p) => p.type === tipo)?.value);
  return { ano: valor("year"), mes: valor("month"), dia: valor("day") };
}

export function dataCivilSaoPaulo(agora = new Date()): string {
  const { ano, mes, dia } = partesNoFuso(agora);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function mesCivilSaoPaulo(agora = new Date()): string {
  return dataCivilSaoPaulo(agora).slice(0, 7);
}

export function dataCivilParaDate(valor: string): Date {
  const partes = parseDataCivil(valor);
  if (!partes) throw new Error("Data civil invalida.");
  return new Date(Date.UTC(partes.ano, partes.mes - 1, partes.dia));
}

function dataCivilDeDate(valor: Date): string | null {
  if (Number.isNaN(valor.getTime())) return null;
  return `${valor.getUTCFullYear()}-${String(valor.getUTCMonth() + 1).padStart(2, "0")}-${String(valor.getUTCDate()).padStart(2, "0")}`;
}

function dataCivilDeCampo(valor: unknown): string | null {
  if (valor instanceof Date) return dataCivilDeDate(valor);
  if (typeof valor !== "string") return null;
  const prefixo = valor.slice(0, 10);
  return dataCivilValida(prefixo) ? prefixo : null;
}

export interface EntradaComDataFinanceira {
  transactionDate?: Date | string | null;
  referenceMonth?: string | null;
  mesReferencia?: string | null;
  createdAt: Date | string;
  dados?: unknown;
}

export function dataFinanceiraEfetiva(
  entrada: EntradaComDataFinanceira,
): string {
  const tipada = dataCivilDeCampo(entrada.transactionDate);
  if (tipada) return tipada;

  const dados =
    entrada.dados && typeof entrada.dados === "object" && !Array.isArray(entrada.dados)
      ? (entrada.dados as Record<string, unknown>)
      : {};
  if (dataCivilValida(dados.data)) return dados.data;

  const criada =
    entrada.createdAt instanceof Date
      ? entrada.createdAt
      : new Date(entrada.createdAt);
  return dataCivilSaoPaulo(criada);
}

export function mesReferenciaEfetivo(
  entrada: EntradaComDataFinanceira,
): string {
  if (mesCivilValido(entrada.referenceMonth)) return entrada.referenceMonth;
  if (mesCivilValido(entrada.mesReferencia)) return entrada.mesReferencia;
  return dataFinanceiraEfetiva(entrada).slice(0, 7);
}

export function proximoMesCivil(valor: string): string {
  const partes = parseMesCivil(valor);
  if (!partes) throw new Error("Mes de referencia invalido.");
  const indice = partes.ano * 12 + (partes.mes - 1) + 1;
  const ano = Math.floor(indice / 12);
  const mes = (indice % 12) + 1;
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

export function deslocarMesCivil(valor: string, delta: number): string {
  const partes = parseMesCivil(valor);
  if (!partes || !Number.isInteger(delta)) {
    throw new Error("Mes de referencia invalido.");
  }
  const indice = partes.ano * 12 + (partes.mes - 1) + delta;
  const ano = Math.floor(indice / 12);
  const mesZeroBased = ((indice % 12) + 12) % 12;
  return `${ano}-${String(mesZeroBased + 1).padStart(2, "0")}`;
}

export function ultimosMesesCivis(
  quantidade: number,
  agora = new Date(),
): string[] {
  const total = Math.max(0, Math.trunc(quantidade));
  const atual = mesCivilSaoPaulo(agora);
  return Array.from({ length: total }, (_, indice) =>
    deslocarMesCivil(atual, indice - total + 1),
  );
}

export function mesesAteMesCivil(
  alvo: string,
  agora = new Date(),
): number | null {
  const destino = parseMesCivil(alvo);
  const atual = parseMesCivil(mesCivilSaoPaulo(agora));
  if (!destino || !atual) return null;
  const meses =
    (destino.ano - atual.ano) * 12 + (destino.mes - atual.mes);
  return meses > 0 ? meses : null;
}

export function dataNoMesCivil(dataBase: string, mesAlvo: string): string {
  const base = parseDataCivil(dataBase);
  const alvo = parseMesCivil(mesAlvo);
  if (!base || !alvo) throw new Error("Data civil invalida.");
  const ultimoDia = new Date(Date.UTC(alvo.ano, alvo.mes, 0)).getUTCDate();
  const dia = Math.min(base.dia, ultimoDia);
  return `${alvo.ano}-${String(alvo.mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function formatarDataCivilCurta(valor: string): string {
  const partes = parseDataCivil(valor);
  if (!partes) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(partes.ano, partes.mes - 1, partes.dia)));
}
