// Classes do grafo do Cérebro. Cada classe é um cluster, na cor do seu módulo
// (CLAUDE.md). Client-safe (sem imports de servidor) — usado pela API e pela UI.

export type ClasseGrafo =
  | "financeiro"
  | "produtividade"
  | "estudos"
  | "biblia"
  | "memorias";

export const CLASSES_GRAFO: Record<
  ClasseGrafo,
  { rotulo: string; cor: string }
> = {
  financeiro: { rotulo: "Financeiro", cor: "#f59e0b" }, // âmbar
  produtividade: { rotulo: "Produtividade & Hábitos", cor: "#14b8a6" }, // verde-azulado
  estudos: { rotulo: "Estudos", cor: "#22d3ee" }, // ciano
  biblia: { rotulo: "Bíblia", cor: "#93c5fd" }, // azul-claro
  memorias: { rotulo: "Memórias & Notas", cor: "#2563eb" }, // acento royal
};

// A qual cluster um Entry pertence. "nota" não tinha módulo próprio no painel;
// entra junto das memórias (conhecimento livre sobre a vida do usuário).
export function classeDeEntry(tipo: string): ClasseGrafo {
  switch (tipo) {
    case "financa":
      return "financeiro";
    case "tarefa":
    case "habito":
      return "produtividade";
    case "estudo":
      return "estudos";
    default:
      return "memorias"; // nota
  }
}
