import type { TipoEntry } from "@/lib/engine/types";
import { cores } from "@/lib/theme";

// Cor de cada módulo (CLAUDE.md). Usada no flash de sucesso do átomo
// e em qualquer indicação visual por tipo. Compartilhada entre motor e UI
// (sem imports de servidor). Valores vêm da paleta central em lib/theme.
export const CORES_MODULO: Record<TipoEntry, string> = {
  financa: cores.financa, // âmbar
  tarefa: cores.produtividade, // verde-azulado
  habito: cores.produtividade, // verde-azulado
  estudo: cores.estudo, // ciano
  nota: cores.biblia, // azul-claro (neutro)
};

export const ROTULO_MODULO: Record<TipoEntry, string> = {
  financa: "Finança",
  tarefa: "Tarefa",
  habito: "Hábito",
  estudo: "Estudo",
  nota: "Nota",
};

export function corDoModulo(tipo: TipoEntry): string {
  return CORES_MODULO[tipo] ?? cores.biblia;
}
