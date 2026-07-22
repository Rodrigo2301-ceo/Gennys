export type TipoEntry = "financa" | "tarefa" | "nota" | "habito" | "estudo";

export type JsonPrimitivo = string | number | boolean | null;
export type JsonValue = JsonPrimitivo | JsonObject | JsonValue[];
export interface JsonObject {
  [chave: string]: JsonValue;
}

export interface ImagemEntrada {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
}

export interface TurnoHistorico {
  autor: "usuario" | "gennys";
  texto: string;
}

export interface EntradaMotor {
  userId: string;
  texto?: string;
  imagem?: ImagemEntrada;
  historico?: TurnoHistorico[];
}

export interface Categorizacao {
  tipo: TipoEntry;
  confianca: number;
  categoria: string | null;
  valor: number | null;
  dados: JsonObject;
  resposta: string;
  pergunta: string | null;
}

export interface PropostaEntrada {
  tipo: TipoEntry;
  confianca: number;
  categoria: string | null;
  valor: number | null;
  dados: JsonObject;
}

export interface ContextoConfirmacaoIa {
  provider: "gemini" | "groq" | "anthropic";
  consentVersion: string;
  purpose: string;
}

export interface ConfirmacaoEntrada {
  userId: string;
  proposta: PropostaEntrada;
  token: string;
}

export type ResultadoMotor =
  | {
      status: "confirmacao";
      resposta: string;
      proposta: PropostaEntrada;
      token: string;
      expiraEm: string;
    }
  | {
      status: "pergunta";
      resposta: string;
      pergunta: string;
    };

export interface ResultadoConfirmacao {
  status: "salvo";
  tipo: TipoEntry;
  resposta: string;
  entryId: string;
  categoria: string | null;
  valor: number | null;
  moduloCor: string;
  idempotente: boolean;
}

export type ErroProcessamentoCodigo =
  | "entrada_invalida"
  | "consentimento_necessario"
  | "cota_excedida"
  | "provedor_indisponivel"
  | "provedor_incompativel"
  | "falha_provedor"
  | "saida_invalida"
  | "confirmacao_invalida"
  | "erro_interno";
