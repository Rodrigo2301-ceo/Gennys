import {
  dataFinanceiraEfetiva,
  dataCivilSaoPaulo,
  mesCivilSaoPaulo,
  mesReferenciaEfetivo,
  type EntradaComDataFinanceira,
} from "./datas";

export const CATEGORIA_PLANO_RESERVA = "plano_reserva";

export interface EntradaFinanceiraCalculo extends EntradaComDataFinanceira {
  id: string;
  valor: unknown;
  categoria?: string | null;
  origemRecorrenteId?: string | null;
  recurrenceKey?: string | null;
  excludeFromTotals?: boolean;
}

export type MovimentoFinanceiro = "receita" | "despesa";

export function movimentoDaEntrada(entrada: {
  dados?: unknown;
}): MovimentoFinanceiro {
  const dados =
    entrada.dados && typeof entrada.dados === "object" && !Array.isArray(entrada.dados)
      ? (entrada.dados as Record<string, unknown>)
      : {};
  return dados.movimento === "receita" ? "receita" : "despesa";
}

export function valorEmCentavos(valor: unknown): number {
  const numero = Number(
    valor && typeof valor === "object" && "toString" in valor
      ? String(valor)
      : valor,
  );
  if (!Number.isFinite(numero)) return 0;
  return Math.round(Math.abs(numero) * 100);
}

export function deduplicarOcorrencias<T extends EntradaFinanceiraCalculo>(
  entradas: readonly T[],
): T[] {
  const canonicas = new Map<string, T>();

  for (const entrada of entradas) {
    if (!entrada.origemRecorrenteId) continue;
    const chave = `${entrada.origemRecorrenteId}:${mesReferenciaEfetivo(entrada)}`;
    const atual = canonicas.get(chave);
    if (!atual) {
      canonicas.set(chave, entrada);
      continue;
    }

    const atualTemChave = Boolean(atual.recurrenceKey);
    const novaTemChave = Boolean(entrada.recurrenceKey);
    const criadaAtual = new Date(atual.createdAt).getTime();
    const criadaNova = new Date(entrada.createdAt).getTime();
    if (
      (!atualTemChave && novaTemChave) ||
      (atualTemChave === novaTemChave &&
        (criadaNova < criadaAtual ||
          (criadaNova === criadaAtual && entrada.id < atual.id)))
    ) {
      canonicas.set(chave, entrada);
    }
  }

  return entradas.filter((entrada) => {
    if (!entrada.origemRecorrenteId) return true;
    const chave = `${entrada.origemRecorrenteId}:${mesReferenciaEfetivo(entrada)}`;
    return canonicas.get(chave)?.id === entrada.id;
  });
}

export interface ResumoFinanceiroCalculado {
  saldoAcumulado: number;
  patrimonio: number;
  receitaMes: number;
  despesaMes: number;
  saldoMes: number;
}

export function calcularResumoDeEntradas(
  entradas: readonly EntradaFinanceiraCalculo[],
  agora = new Date(),
): ResumoFinanceiroCalculado {
  const mesAtual = mesCivilSaoPaulo(agora);
  const hoje = dataCivilSaoPaulo(agora);
  let saldoCentavos = 0;
  let receitaMesCentavos = 0;
  let despesaMesCentavos = 0;

  for (const entrada of deduplicarOcorrencias(entradas)) {
    if (entrada.excludeFromTotals) continue;
    if (entrada.categoria === CATEGORIA_PLANO_RESERVA) continue;
    if (dataFinanceiraEfetiva(entrada) > hoje) continue;

    const centavos = valorEmCentavos(entrada.valor);
    const receita = movimentoDaEntrada(entrada) === "receita";
    saldoCentavos += receita ? centavos : -centavos;

    if (mesReferenciaEfetivo(entrada) === mesAtual) {
      if (receita) receitaMesCentavos += centavos;
      else despesaMesCentavos += centavos;
    }
  }

  const saldoAcumulado = saldoCentavos / 100;
  const receitaMes = receitaMesCentavos / 100;
  const despesaMes = despesaMesCentavos / 100;
  return {
    saldoAcumulado,
    patrimonio: saldoAcumulado,
    receitaMes,
    despesaMes,
    saldoMes: (receitaMesCentavos - despesaMesCentavos) / 100,
  };
}

export interface MediaFinanceiraCalculada {
  receitaMedia: number;
  despesaMedia: number;
  mesesConsiderados: number;
}

export function calcularMediaDeEntradas(
  entradas: readonly EntradaFinanceiraCalculo[],
  agora = new Date(),
): MediaFinanceiraCalculada {
  const mesAtual = mesCivilSaoPaulo(agora);
  const validas = deduplicarOcorrencias(entradas).filter(
    (entrada) =>
      !entrada.excludeFromTotals &&
      entrada.categoria !== CATEGORIA_PLANO_RESERVA &&
      mesReferenciaEfetivo(entrada) <= mesAtual,
  );
  const meses = Array.from(
    new Set(validas.map((entrada) => mesReferenciaEfetivo(entrada))),
  )
    .sort()
    .slice(-3);

  if (meses.length === 0) {
    return { receitaMedia: 0, despesaMedia: 0, mesesConsiderados: 0 };
  }

  const mesesUsados = new Set(meses);
  let receitaCentavos = 0;
  let despesaCentavos = 0;
  for (const entrada of validas) {
    if (!mesesUsados.has(mesReferenciaEfetivo(entrada))) continue;
    const centavos = valorEmCentavos(entrada.valor);
    if (movimentoDaEntrada(entrada) === "receita") receitaCentavos += centavos;
    else despesaCentavos += centavos;
  }

  return {
    receitaMedia: receitaCentavos / meses.length / 100,
    despesaMedia: despesaCentavos / meses.length / 100,
    mesesConsiderados: meses.length,
  };
}
