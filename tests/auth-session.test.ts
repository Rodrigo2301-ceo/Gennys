import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: state.findUnique } },
}));
vi.mock("@/lib/security/rateLimit", () => ({
  RATE_LIMITS: { loginIp: {}, loginCredential: {} },
  limitByIp: vi.fn(),
  limitByCredential: vi.fn(),
}));

import { authOptions } from "../lib/auth";

describe("revogacao de sessao JWT", () => {
  beforeEach(() => state.findUnique.mockReset());

  it("nao expoe sessao quando o usuario foi excluido", async () => {
    state.findUnique.mockResolvedValue(null);
    const token = await authOptions.callbacks!.jwt!({
      token: { id: "user-a", sessionVersion: 2 },
      user: undefined,
      account: null,
      profile: undefined,
      trigger: undefined,
      isNewUser: false,
      session: undefined,
    } as never);
    expect(token.invalidated).toBe(true);
    expect(token.id).toBeUndefined();

    const session = await authOptions.callbacks!.session!({
      session: { user: { id: "user-a", sessionVersion: 2 }, expires: "future" },
      token,
      user: undefined,
      newSession: undefined,
      trigger: "update",
    } as never);
    expect(session.user).toBeUndefined();
  });

  it("invalida versao antiga e atualiza identidade da versao vigente", async () => {
    state.findUnique.mockResolvedValueOnce({
      name: "Nome novo",
      email: "novo@example.test",
      sessionVersion: 3,
    });
    const stale = await authOptions.callbacks!.jwt!({
      token: { id: "user-a", sessionVersion: 2 },
    } as never);
    expect(stale.invalidated).toBe(true);

    state.findUnique.mockResolvedValueOnce({
      name: "Nome novo",
      email: "novo@example.test",
      sessionVersion: 3,
    });
    const current = await authOptions.callbacks!.jwt!({
      token: { id: "user-a", sessionVersion: 3 },
    } as never);
    expect(current.invalidated).toBe(false);
    expect(current.name).toBe("Nome novo");
    expect(current.email).toBe("novo@example.test");
  });
});
