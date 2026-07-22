import { SaidaIaInvalidaError } from "./errors";
import type {
  Categorizacao,
  JsonObject,
  JsonValue,
  PropostaEntrada,
  TipoEntry,
} from "./types";

const TIPOS_VALIDOS = new Set<TipoEntry>([
  "financa",
  "tarefa",
  "nota",
  "habito",
  "estudo",
]);
const CHAVES_OBRIGATORIAS = [
  "tipo",
  "confianca",
  "categoria",
  "valor",
  "dados",
  "resposta",
  "pergunta",
] as const;
const CHAVES_PERMITIDAS = new Set([...CHAVES_OBRIGATORIAS, "memorias"]);

export const LIMITE_SAIDA_IA_CARACTERES = 20_000;
const LIMITE_DADOS_CARACTERES = 8_000;
const LIMITE_CATEGORIA = 80;
const LIMITE_RESPOSTA = 600;
const LIMITE_PERGUNTA = 400;
const LIMITE_MEMORIAS_DESCARTADAS = 10;
const LIMITE_FATO_DESCARTADO = 240;
const LIMITE_CHAVES_JSON = 60;
const LIMITE_ARRAY_JSON = 30;
const LIMITE_STRING_JSON = 1_000;
const LIMITE_PROFUNDIDADE_JSON = 5;
const LIMITE_VALOR_FINANCEIRO = 1_000_000_000_000;

function falhar(): never {
  throw new SaidaIaInvalidaError();
}

function ehObjetoSimples(valor: unknown): valor is Record<string, unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor) &&
    (Object.getPrototypeOf(valor) === Object.prototype ||
      Object.getPrototypeOf(valor) === null)
  );
}

function validarJson(
  valor: unknown,
  profundidade: number,
  contador: { chaves: number },
): JsonValue {
  if (valor === null || typeof valor === "boolean") return valor;
  if (typeof valor === "number") {
    if (!Number.isFinite(valor) || Math.abs(valor) > LIMITE_VALOR_FINANCEIRO) falhar();
    return valor;
  }
  if (typeof valor === "string") {
    if (valor.length > LIMITE_STRING_JSON) falhar();
    return valor;
  }
  if (profundidade >= LIMITE_PROFUNDIDADE_JSON) falhar();
  if (Array.isArray(valor)) {
    if (valor.length > LIMITE_ARRAY_JSON) falhar();
    return valor.map((item) => validarJson(item, profundidade + 1, contador));
  }
  if (!ehObjetoSimples(valor)) falhar();

  const resultado: JsonObject = {};
  for (const [chave, item] of Object.entries(valor)) {
    if (
      !chave ||
      chave.length > 80 ||
      chave === "__proto__" ||
      chave === "prototype" ||
      chave === "constructor"
    ) {
      falhar();
    }
    contador.chaves += 1;
    if (contador.chaves > LIMITE_CHAVES_JSON) falhar();
    resultado[chave] = validarJson(item, profundidade + 1, contador);
  }
  return resultado;
}

function validarMemoriasDescartadas(valor: unknown): void {
  if (valor === undefined) return;
  if (!Array.isArray(valor) || valor.length > LIMITE_MEMORIAS_DESCARTADAS) falhar();
  for (const item of valor) {
    if (!ehObjetoSimples(item)) falhar();
    const chaves = Object.keys(item);
    if (chaves.some((chave) => chave !== "fato" && chave !== "categoria")) falhar();
    if (
      typeof item.fato !== "string" ||
      item.fato.length === 0 ||
      item.fato.length > LIMITE_FATO_DESCARTADO ||
      !(
        item.categoria === null ||
        (typeof item.categoria === "string" && item.categoria.length <= LIMITE_CATEGORIA)
      )
    ) {
      falhar();
    }
  }
}

export function extrairJSON(texto: string): unknown {
  if (!texto || texto.length > LIMITE_SAIDA_IA_CARACTERES) falhar();
  let limpo = texto.trim();
  if (limpo.startsWith("```json") && limpo.endsWith("```")) {
    limpo = limpo.slice(7, -3).trim();
  } else if (limpo.startsWith("```") && limpo.endsWith("```")) {
    limpo = limpo.slice(3, -3).trim();
  }
  if (!limpo.startsWith("{") || !limpo.endsWith("}")) falhar();
  try {
    return JSON.parse(limpo);
  } catch {
    return falhar();
  }
}

export function normalizarCategorizacao(bruto: unknown): Categorizacao {
  if (!ehObjetoSimples(bruto)) falhar();
  const chaves = Object.keys(bruto);
  if (
    CHAVES_OBRIGATORIAS.some((chave) => !chaves.includes(chave)) ||
    chaves.some((chave) => !CHAVES_PERMITIDAS.has(chave))
  ) {
    falhar();
  }

  if (typeof bruto.tipo !== "string" || !TIPOS_VALIDOS.has(bruto.tipo as TipoEntry)) {
    falhar();
  }
  if (
    typeof bruto.confianca !== "number" ||
    !Number.isFinite(bruto.confianca) ||
    bruto.confianca < 0 ||
    bruto.confianca > 1
  ) {
    falhar();
  }
  if (
    !(
      bruto.categoria === null ||
      (typeof bruto.categoria === "string" &&
        bruto.categoria.trim().length > 0 &&
        bruto.categoria.trim().length <= LIMITE_CATEGORIA)
    )
  ) {
    falhar();
  }

  let valor: number | null = null;
  if (bruto.tipo === "financa") {
    if (bruto.valor !== null) {
      if (
        typeof bruto.valor !== "number" ||
        !Number.isFinite(bruto.valor) ||
        bruto.valor <= 0 ||
        bruto.valor > LIMITE_VALOR_FINANCEIRO
      ) {
        falhar();
      }
      valor = bruto.valor;
    }
  } else if (bruto.valor !== null) {
    falhar();
  }

  if (!ehObjetoSimples(bruto.dados)) falhar();
  const dados = validarJson(bruto.dados, 0, { chaves: 0 });
  if (!ehObjetoSimples(dados) || JSON.stringify(dados).length > LIMITE_DADOS_CARACTERES) {
    falhar();
  }
  if (
    typeof bruto.resposta !== "string" ||
    bruto.resposta.trim().length === 0 ||
    bruto.resposta.trim().length > LIMITE_RESPOSTA
  ) {
    falhar();
  }
  if (
    !(
      bruto.pergunta === null ||
      (typeof bruto.pergunta === "string" &&
        bruto.pergunta.trim().length > 0 &&
        bruto.pergunta.trim().length <= LIMITE_PERGUNTA)
    )
  ) {
    falhar();
  }
  validarMemoriasDescartadas(bruto.memorias);

  return {
    tipo: bruto.tipo as TipoEntry,
    confianca: bruto.confianca,
    categoria:
      typeof bruto.categoria === "string" ? bruto.categoria.trim() : null,
    valor,
    dados: dados as JsonObject,
    resposta: bruto.resposta.trim(),
    pergunta: typeof bruto.pergunta === "string" ? bruto.pergunta.trim() : null,
  };
}

export function validarPropostaEntrada(bruto: unknown): PropostaEntrada {
  if (!ehObjetoSimples(bruto)) falhar();
  const chavesEsperadas = ["tipo", "confianca", "categoria", "valor", "dados"];
  const chaves = Object.keys(bruto);
  if (
    chaves.length !== chavesEsperadas.length ||
    chavesEsperadas.some((chave) => !chaves.includes(chave))
  ) {
    falhar();
  }

  const validada = normalizarCategorizacao({
    ...bruto,
    resposta: "ok",
    pergunta: null,
  });
  return {
    tipo: validada.tipo,
    confianca: validada.confianca,
    categoria: validada.categoria,
    valor: validada.valor,
    dados: validada.dados,
  };
}
