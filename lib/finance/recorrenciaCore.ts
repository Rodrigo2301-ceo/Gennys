import {
  dataCivilParaDate,
  dataFinanceiraEfetiva,
  dataNoMesCivil,
  mesCivilSaoPaulo,
  mesReferenciaEfetivo,
  proximoMesCivil,
  type EntradaComDataFinanceira,
} from "./datas";

export interface TemplateRecorrencia extends EntradaComDataFinanceira {
  id: string;
  userId: string;
  dados: unknown;
  valor: unknown;
  categoria: string | null;
}

export interface OcorrenciaPlanejada {
  userId: string;
  tipo: "financa";
  dados: Record<string, unknown>;
  valor: unknown;
  categoria: string | null;
  locked: false;
  recurring: false;
  origemRecorrenteId: string;
  transactionDate: Date;
  referenceMonth: string;
  mesReferencia: string;
  recurrenceKey: string;
}

export function planejarOcorrencias(
  template: TemplateRecorrencia,
  agora = new Date(),
): OcorrenciaPlanejada[] {
  const mesAtual = mesCivilSaoPaulo(agora);
  const dataBase = dataFinanceiraEfetiva(template);
  let cursor = mesReferenciaEfetivo(template);
  const ocorrencias: OcorrenciaPlanejada[] = [];

  for (let i = 0; i < 240; i++) {
    cursor = proximoMesCivil(cursor);
    if (cursor > mesAtual) break;

    const dataCivil = dataNoMesCivil(dataBase, cursor);
    const dadosOriginais =
      template.dados &&
      typeof template.dados === "object" &&
      !Array.isArray(template.dados)
        ? (template.dados as Record<string, unknown>)
        : {};
    ocorrencias.push({
      userId: template.userId,
      tipo: "financa",
      dados: { ...dadosOriginais, data: dataCivil },
      valor: template.valor,
      categoria: template.categoria,
      locked: false,
      recurring: false,
      origemRecorrenteId: template.id,
      transactionDate: dataCivilParaDate(dataCivil),
      referenceMonth: cursor,
      mesReferencia: cursor,
      recurrenceKey: `${template.id}:${cursor}`,
    });
  }

  return ocorrencias;
}
