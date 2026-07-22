import { describe, expect, it } from "vitest";
import {
  dataCivilSaoPaulo,
  dataFinanceiraEfetiva,
  dataNoMesCivil,
  deslocarMesCivil,
  mesesAteMesCivil,
  mesCivilSaoPaulo,
  parseDataCivil,
  parseMesCivil,
  ultimosMesesCivis,
} from "../lib/finance/datas";

describe("datas civis financeiras", () => {
  it("valida calendario sem normalizar datas impossiveis", () => {
    expect(parseDataCivil("2024-02-29")).toEqual({ ano: 2024, mes: 2, dia: 29 });
    expect(parseDataCivil("2025-02-29")).toBeNull();
    expect(parseDataCivil("2026-13-01")).toBeNull();
    expect(parseDataCivil("2026-04-31")).toBeNull();
    expect(parseMesCivil("2026-00")).toBeNull();
  });

  it("respeita a virada do mes em America/Sao_Paulo", () => {
    const aindaJulho = new Date("2026-08-01T02:59:59.999Z");
    const jaAgosto = new Date("2026-08-01T03:00:00.000Z");
    expect(dataCivilSaoPaulo(aindaJulho)).toBe("2026-07-31");
    expect(mesCivilSaoPaulo(aindaJulho)).toBe("2026-07");
    expect(dataCivilSaoPaulo(jaAgosto)).toBe("2026-08-01");
    expect(mesCivilSaoPaulo(jaAgosto)).toBe("2026-08");
  });

  it("respeita a virada do ano em America/Sao_Paulo", () => {
    expect(dataCivilSaoPaulo(new Date("2027-01-01T02:59:59Z"))).toBe(
      "2026-12-31",
    );
    expect(dataCivilSaoPaulo(new Date("2027-01-01T03:00:00Z"))).toBe(
      "2027-01-01",
    );
  });

  it("mantem o dia da recorrencia e limita ao fim do mes", () => {
    expect(dataNoMesCivil("2025-01-31", "2025-02")).toBe("2025-02-28");
    expect(dataNoMesCivil("2024-01-31", "2024-02")).toBe("2024-02-29");
    expect(dataNoMesCivil("2025-01-31", "2025-03")).toBe("2025-03-31");
  });

  it("calcula meses por aritmetica civil, inclusive dezembro/janeiro", () => {
    expect(deslocarMesCivil("2026-12", 1)).toBe("2027-01");
    expect(deslocarMesCivil("2027-01", -1)).toBe("2026-12");
    expect(
      mesesAteMesCivil("2027-01", new Date("2026-12-15T15:00:00Z")),
    ).toBe(1);
    expect(
      ultimosMesesCivis(3, new Date("2027-01-15T15:00:00Z")),
    ).toEqual(["2026-11", "2026-12", "2027-01"]);
  });

  it("prioriza data tipada, depois JSON legado e por fim createdAt em SP", () => {
    const base = { createdAt: "2026-08-01T02:30:00.000Z" };
    expect(
      dataFinanceiraEfetiva({
        ...base,
        transactionDate: "2026-05-10T00:00:00.000Z",
        dados: { data: "2026-06-10" },
      }),
    ).toBe("2026-05-10");
    expect(
      dataFinanceiraEfetiva({ ...base, dados: { data: "2026-06-10" } }),
    ).toBe("2026-06-10");
    expect(dataFinanceiraEfetiva(base)).toBe("2026-07-31");
  });
});
