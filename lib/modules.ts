import type { TipoEntry } from "@/lib/engine/types";

// Cor de cada módulo (CLAUDE.md). Usada no flash de sucesso do átomo
// e em qualquer indicação visual por tipo. Compartilhada entre motor e UI
// (sem imports de servidor).
export const CORES_MODULO: Record<TipoEntry, string> = {
  financa: "#f59e0b", // âmbar
  tarefa: "#14b8a6", // produtividade / verde-azulado
  habito: "#14b8a6", // produtividade / verde-azulado
  estudo: "#22d3ee", // ciano
  nota: "#93c5fd", // azul-claro (neutro)
};

export const ROTULO_MODULO: Record<TipoEntry, string> = {
  financa: "Finança",
  tarefa: "Tarefa",
  habito: "Hábito",
  estudo: "Estudo",
  nota: "Nota",
};

export function corDoModulo(tipo: TipoEntry): string {
  return CORES_MODULO[tipo] ?? "#93c5fd";
}
