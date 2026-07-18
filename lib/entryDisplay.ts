// Helpers de exibição de Entry no painel. Client-safe (sem imports de servidor).

export interface EntryLike {
  id: string;
  tipo: string;
  dados: unknown;
  valor: string | number | null;
  categoria: string | null;
  locked: boolean;
  createdAt: string;
  mesReferencia?: string | null;
  origemRecorrenteId?: string | null;
}

export function formatarReais(valor: number | string | null): string {
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function dadosObj(entry: EntryLike): Record<string, unknown> {
  return (entry.dados ?? {}) as Record<string, unknown>;
}

export function tituloEntry(entry: EntryLike): string {
  const d = dadosObj(entry);
  const nome =
    (typeof d.nome === "string" && d.nome) ||
    (typeof d.titulo === "string" && d.titulo) ||
    (typeof d.estabelecimento === "string" && d.estabelecimento) ||
    entry.categoria ||
    "Registro";
  return nome;
}

export function horarioEntry(entry: EntryLike): string | null {
  const d = dadosObj(entry);
  return typeof d.horario === "string" ? d.horario : null;
}

export function duracaoMinutosEntry(entry: EntryLike): number | null {
  const d = dadosObj(entry);
  const n = Number(d.duracaoMinutos);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function formatarMinutos(min: number): string {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m}min` : `${h}h`;
}

// Palavras-chave que indicam "treino" dentro de um hábito (sem tipo dedicado
// no motor — heurística simples sobre a categoria já extraída pela IA).
const PALAVRAS_TREINO = [
  "treino",
  "academia",
  "exercício",
  "exercicio",
  "musculação",
  "musculacao",
  "corrida",
  "cardio",
  "cárdio",
  "yoga",
  "pilates",
  "natação",
  "natacao",
];

export function ehTreino(entry: EntryLike): boolean {
  const alvo = `${entry.categoria ?? ""} ${tituloEntry(entry)}`.toLowerCase();
  return PALAVRAS_TREINO.some((p) => alvo.includes(p));
}
