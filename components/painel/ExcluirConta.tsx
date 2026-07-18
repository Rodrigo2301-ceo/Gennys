"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

// Exclusão de conta (LGPD). Fica no rodapé do painel. Fluxo: abrir → avisar →
// confirmar com a senha → apaga tudo (cascade) → logout.
export default function ExcluirConta() {
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  async function excluir() {
    if (!senha) {
      setErro("Digite sua senha para confirmar.");
      return;
    }
    setExcluindo(true);
    setErro(null);
    try {
      const res = await fetch("/api/conta", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErro(d.error ?? "Não foi possível excluir a conta.");
        setExcluindo(false);
        return;
      }
      // Sessão ainda existe no client (JWT) — encerra e volta pro login.
      await signOut({ callbackUrl: "/login" });
    } catch {
      setErro("Falha de conexão. Tente de novo.");
      setExcluindo(false);
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="text-xs text-muted transition hover:text-mod-financa"
      >
        Excluir minha conta
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-mod-financa/30 bg-mod-financa/5 p-3">
      <p className="text-sm font-medium text-mod-financa">Excluir conta</p>
      <p className="text-xs text-muted">
        Isso apaga permanentemente sua conta e todos os seus dados (finanças,
        tarefas, hábitos, estudos, marcações da Bíblia e memórias). Não dá pra
        desfazer.
      </p>
      <input
        type="password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        placeholder="Sua senha"
        autoComplete="current-password"
        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm outline-none focus:border-mod-financa"
      />
      {erro && <p className="text-xs text-mod-financa">{erro}</p>}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => {
            setAberto(false);
            setSenha("");
            setErro(null);
          }}
          disabled={excluindo}
          className="rounded-lg px-3 py-1.5 text-xs text-muted hover:text-foreground disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={excluir}
          disabled={excluindo}
          className="rounded-lg bg-mod-financa px-3 py-1.5 text-xs font-medium text-royal-900 transition hover:brightness-110 disabled:opacity-50"
        >
          {excluindo ? "Excluindo…" : "Excluir permanentemente"}
        </button>
      </div>
    </div>
  );
}
