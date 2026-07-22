import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  currentUser: vi.fn(),
  entryFindFirst: vi.fn(),
  entryUpdate: vi.fn(),
  translationFind: vi.fn(),
  bookFind: vi.fn(),
  verseFind: vi.fn(),
  markUpsert: vi.fn(),
}));

vi.mock("@/lib/security/session", () => ({
  requireCurrentUser: state.currentUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    entry: {
      findFirst: state.entryFindFirst,
      update: state.entryUpdate,
    },
    bibleTranslation: { findUnique: state.translationFind },
    bibleBook: { findUnique: state.bookFind },
    bibleVerse: { findUnique: state.verseFind },
    verseMark: { upsert: state.markUpsert },
  },
}));

import { PATCH as patchEntry } from "../app/api/entries/[id]/route";
import { POST as createMark } from "../app/api/biblia/marcacoes/route";

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`https://www.gennys.com.br${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://www.gennys.com.br",
    },
    body: JSON.stringify(body),
  });
}

describe("isolamento e allowlist das APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.currentUser.mockResolvedValue({
      id: "user_b",
      name: "B",
      email: "b@example.test",
      sessionVersion: 1,
    });
  });

  it("procura entry simultaneamente por id e pelo usuario da sessao", async () => {
    state.entryFindFirst.mockResolvedValue(null);
    const response = await patchEntry(
      jsonRequest("/api/entries/entry_a", { categoria: "teste" }),
      { params: { id: "entry_a" } },
    );
    expect(response.status).toBe(404);
    expect(state.entryFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "entry_a", userId: "user_b" },
      }),
    );
    expect(state.entryUpdate).not.toHaveBeenCalled();
  });

  it("nunca aceita o cliente alterar excludeFromTotals", async () => {
    state.entryFindFirst.mockResolvedValue({
      id: "entry_b",
      tipo: "financa",
      locked: false,
    });
    const response = await patchEntry(
      jsonRequest("/api/entries/entry_b", { excludeFromTotals: false }),
      { params: { id: "entry_b" } },
    );
    expect(response.status).toBe(400);
    expect(state.entryUpdate).not.toHaveBeenCalled();
  });
});

describe("snapshot canonico de marcacao biblica", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.currentUser.mockResolvedValue({
      id: "user_a",
      name: "A",
      email: "a@example.test",
      sessionVersion: 1,
    });
    state.translationFind.mockResolvedValue({ id: "translation_1" });
    state.bookFind.mockResolvedValue({ id: "book_1", code: "JHN", name: "João" });
    state.verseFind.mockResolvedValue({ text: "Texto canônico" });
  });

  it("rejeita texto adulterado antes do upsert", async () => {
    const response = await createMark(
      jsonRequest("/api/biblia/marcacoes", {
        versao: "ALM1911",
        livroCode: "JHN",
        livroNome: "João",
        capitulo: 3,
        versiculo: 16,
        texto: "Texto adulterado",
        cor: "#93c5fd",
        observacao: null,
      }),
    );
    expect(response.status).toBe(409);
    expect(state.markUpsert).not.toHaveBeenCalled();
  });
});
