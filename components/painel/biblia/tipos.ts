export interface Versao {
  code: string;
  name: string;
  year: number | null;
}

export interface LivroBiblia {
  code: string;
  name: string;
  abbrev: string;
  testamento: "AT" | "NT";
  numCapitulos: number;
}

export interface Marcacao {
  id: string;
  translationCode: string;
  bookCode: string;
  bookName: string;
  chapter: number;
  verse: number;
  texto: string;
  cor: string;
  observacao: string | null;
  createdAt: string;
}

// Paleta de cores para highlight (legível sobre o fundo azul royal).
export const CORES_MARCA: { nome: string; cor: string }[] = [
  { nome: "Azul", cor: "#93c5fd" },
  { nome: "Ciano", cor: "#67e8f9" },
  { nome: "Âmbar", cor: "#f59e0b" },
  { nome: "Verde", cor: "#14b8a6" },
  { nome: "Rosa", cor: "#f472b6" },
];
