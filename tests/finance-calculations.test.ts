import { describe, expect, it } from "vitest";
import {
  calcularMediaDeEntradas,
  calcularResumoDeEntradas,
  type EntradaFinanceiraCalculo,
} from "../lib/finance/calculos";

function entrada(
  parcial: Partial<EntradaFinanceiraCalculo> & Pick<EntradaFinanceiraCalculo, "id">,
): EntradaFinanceiraCalculo {
  const { id, ...restante } = parcial;
  return {
    id,
    valor: 0,
    dados: { movimento: "despesa" },
    categoria: "outros",
    createdAt: "2026-07-15T15:00:00.000Z",
    ...restante,
  };
}

describe("calculos financeiros por competencia", () => {
  const agora = new Date("2026-07-20T15:00:00.000Z");

  it("nao joga lancamento retroativo no mes de criacao", () => {
    const resumo = calcularResumoDeEntradas(
      [
        entrada({
          id: "receita-junho",
          valor: "1000.00",
          dados: { movimento: "receita" },
          transactionDate: "2026-06-10",
          referenceMonth: "2026-06",
        }),
        entrada({
          id: "despesa-julho",
          valor: "100.00",
          transactionDate: "2026-07-05",
          referenceMonth: "2026-07",
        }),
      ],
      agora,
    );

    expect(resumo.saldoAcumulado).toBe(900);
    expect(resumo.patrimonio).toBe(900);
    expect(resumo.receitaMes).toBe(0);
    expect(resumo.despesaMes).toBe(100);
    expect(resumo.saldoMes).toBe(-100);
  });

  it("ignora futuro, plano e duplicatas legadas nos totais", () => {
    const resumo = calcularResumoDeEntradas(
      [
        entrada({
          id: "base",
          valor: 500,
          dados: { movimento: "receita" },
          transactionDate: "2026-07-01",
          referenceMonth: "2026-07",
        }),
        entrada({
          id: "canonica",
          valor: 50,
          transactionDate: "2026-07-10",
          referenceMonth: "2026-07",
          origemRecorrenteId: "template",
          recurrenceKey: "template:2026-07",
        }),
        entrada({
          id: "duplicada",
          valor: 50,
          transactionDate: "2026-07-10",
          referenceMonth: "2026-07",
          origemRecorrenteId: "template",
          excludeFromTotals: true,
        }),
        entrada({
          id: "plano",
          valor: 9999,
          categoria: "plano_reserva",
          transactionDate: "2026-07-10",
        }),
        entrada({
          id: "futura",
          valor: 700,
          dados: { movimento: "receita" },
          transactionDate: "2026-08-01",
          referenceMonth: "2026-08",
        }),
      ],
      agora,
    );

    expect(resumo.saldoAcumulado).toBe(450);
    expect(resumo.receitaMes).toBe(500);
    expect(resumo.despesaMes).toBe(50);
  });

  it("usa os tres meses de referencia mais recentes com dados", () => {
    const media = calcularMediaDeEntradas(
      [
        entrada({ id: "jan", valor: 9000, transactionDate: "2026-01-05", referenceMonth: "2026-01" }),
        entrada({ id: "abr-r", valor: 3000, dados: { movimento: "receita" }, transactionDate: "2026-04-05", referenceMonth: "2026-04" }),
        entrada({ id: "abr-d", valor: 900, transactionDate: "2026-04-06", referenceMonth: "2026-04" }),
        entrada({ id: "mai-r", valor: 6000, dados: { movimento: "receita" }, transactionDate: "2026-05-05", referenceMonth: "2026-05" }),
        entrada({ id: "jun-r", valor: 9000, dados: { movimento: "receita" }, transactionDate: "2026-06-05", referenceMonth: "2026-06" }),
      ],
      agora,
    );

    expect(media.mesesConsiderados).toBe(3);
    expect(media.receitaMedia).toBe(6000);
    expect(media.despesaMedia).toBe(300);
  });
});
