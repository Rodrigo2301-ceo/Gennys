import { describe, expect, it } from "vitest";
import { planejarOcorrencias } from "../lib/finance/recorrenciaCore";

describe("planejamento de recorrencias", () => {
  it("gera uma chave deterministica por template e mes", () => {
    const ocorrencias = planejarOcorrencias(
      {
        id: "tpl_1",
        userId: "usr_1",
        dados: { movimento: "despesa", nome: "Aluguel", data: "2025-01-31" },
        valor: "1200.00",
        categoria: "moradia",
        createdAt: "2025-01-31T15:00:00.000Z",
        transactionDate: "2025-01-31",
        referenceMonth: "2025-01",
      },
      new Date("2025-04-15T15:00:00.000Z"),
    );

    expect(ocorrencias.map((o) => o.recurrenceKey)).toEqual([
      "tpl_1:2025-02",
      "tpl_1:2025-03",
      "tpl_1:2025-04",
    ]);
    expect(ocorrencias.map((o) => (o.dados as { data: string }).data)).toEqual([
      "2025-02-28",
      "2025-03-31",
      "2025-04-30",
    ]);
  });

  it("preserva receita/despesa nos dados copiados", () => {
    const [receita] = planejarOcorrencias(
      {
        id: "salario",
        userId: "usr_1",
        dados: { movimento: "receita", nome: "Salario" },
        valor: 5000,
        categoria: "renda",
        createdAt: "2026-06-05T15:00:00.000Z",
        transactionDate: "2026-06-05",
        referenceMonth: "2026-06",
      },
      new Date("2026-07-20T15:00:00.000Z"),
    );

    expect(receita.dados.movimento).toBe("receita");
    expect(receita.referenceMonth).toBe("2026-07");
    expect(receita.recurring).toBe(false);
  });

  it("nao gera ocorrencia para mes futuro", () => {
    expect(
      planejarOcorrencias(
        {
          id: "futuro",
          userId: "usr_1",
          dados: { movimento: "despesa" },
          valor: 10,
          categoria: null,
          createdAt: "2026-08-01T15:00:00.000Z",
          transactionDate: "2026-08-01",
          referenceMonth: "2026-08",
        },
        new Date("2026-07-20T15:00:00.000Z"),
      ),
    ).toEqual([]);
  });
});
