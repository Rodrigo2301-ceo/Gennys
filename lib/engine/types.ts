// Tipos do motor de processamento. O motor é AGNÓSTICO AO CANAL:
// hoje é chamado pelo chat do app; amanhã pode ser um webhook do WhatsApp.
// Nada aqui importa React/Next — só entrada -> IA -> persistência -> resultado.

export type TipoEntry = "financa" | "tarefa" | "nota" | "habito" | "estudo";

export interface ImagemEntrada {
  base64: string; // sem o prefixo "data:...;base64,"
  mediaType: string; // ex.: "image/jpeg", "image/png", "image/webp"
}

export interface TurnoHistorico {
  autor: "usuario" | "gennys";
  texto: string;
}

// Entrada do motor. `texto` e/ou `imagem` devem estar presentes.
export interface EntradaMotor {
  userId: string;
  texto?: string;
  imagem?: ImagemEntrada;
  // Continuidade para o fluxo "perguntar antes de salvar".
  historico?: TurnoHistorico[];
}

// Contrato JSON que o Claude deve devolver.
export interface Categorizacao {
  tipo: TipoEntry;
  confianca: number; // 0..1
  categoria: string | null;
  valor: number | null; // em reais, somente para "financa"
  dados: Record<string, unknown>;
  resposta: string; // confirmação curta em PT-BR
  pergunta: string | null; // preenchido quando falta clareza
  memorias: { fato: string; categoria: string | null }[];
}

// Resultado devolvido a quem chamou o motor (UI, webhook, etc.).
export type ResultadoMotor =
  | {
      status: "salvo";
      tipo: TipoEntry;
      resposta: string;
      entryId: string;
      categoria: string | null;
      valor: number | null;
      moduloCor: string;
    }
  | {
      status: "pergunta";
      resposta: string; // texto curto que introduz a dúvida
      pergunta: string; // o que o Gennys precisa saber
    }
  | {
      status: "erro";
      mensagem: string;
    };
