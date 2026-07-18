"use client";

import { useState } from "react";
import type { Marcacao } from "./tipos";
import { CORES_MARCA } from "./tipos";
import { SecaoTitulo } from "@/components/ui/base";
import { Aspas } from "@/components/ui/icones";

const FONTE_LEITURA = 'Georgia, "Times New Roman", serif';

export default function MinhasMarcacoes({
  marcacoes,
  onMarcacoes,
}: {
  marcacoes: Marcacao[];
  onMarcacoes: (m: Marcacao[]) => void;
}) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [corEdit, setCorEdit] = useState(CORES_MARCA[0].cor);
  const [obsEdit, setObsEdit] = useState("");
  const [salvando, setSalvando] = useState(false);

  function abrirEdicao(m: Marcacao) {
    setEditandoId(m.id);
    setCorEdit(m.cor);
    setObsEdit(m.observacao ?? "");
  }

  async function salvar(id: string) {
    setSalvando(true);
    try {
      const res = await fetch(`/api/biblia/marcacoes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cor: corEdit, observacao: obsEdit }),
      });
      const data = await res.json();
      if (res.ok && data.marcacao) {
        onMarcacoes(marcacoes.map((m) => (m.id === id ? data.marcacao : m)));
        setEditandoId(null);
      }
    } finally {
      setSalvando(false);
    }
  }

  async function apagar(id: string) {
    if (!confirm("Apagar esta marcação?")) return;
    const res = await fetch(`/api/biblia/marcacoes/${id}`, { method: "DELETE" });
    if (res.ok) {
      onMarcacoes(marcacoes.filter((m) => m.id !== id));
    }
  }

  if (marcacoes.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">
        Você ainda não marcou nenhum versículo. Toque em um versículo na leitura
        para marcar.
      </p>
    );
  }

  return (
    <div>
      <SecaoTitulo>Meditações recentes</SecaoTitulo>
      <ul className="flex flex-col gap-2">
        {marcacoes.map((m) => (
          <li
            key={m.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-3"
            style={{ boxShadow: `inset 3px 0 0 ${m.cor}` }}
          >
            <div className="flex gap-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                style={{ color: m.cor, backgroundColor: `${m.cor}1f` }}
              >
                <Aspas size={15} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-mod-biblia">
                      {m.bookName} {m.chapter}:{m.verse}
                      <span className="ml-1.5 text-xs font-normal text-muted">
                        {m.translationCode}
                      </span>
                    </p>
                    <p
                      className="mt-1 text-sm text-foreground/90"
                      style={{ fontFamily: FONTE_LEITURA }}
                    >
                      {m.texto}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      title="Editar"
                      onClick={() => abrirEdicao(m)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-white/10 hover:text-foreground"
                    >
                      ✎
                    </button>
                    <button
                      title="Apagar"
                      onClick={() => apagar(m.id)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-mod-financa/20 hover:text-mod-financa"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {editandoId === m.id ? (
                  <div className="mt-2 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {CORES_MARCA.map((c) => (
                        <button
                          key={c.cor}
                          title={c.nome}
                          onClick={() => setCorEdit(c.cor)}
                          className={`h-6 w-6 rounded-full transition ${
                            corEdit === c.cor
                              ? "ring-2 ring-white ring-offset-2 ring-offset-royal-900"
                              : ""
                          }`}
                          style={{ backgroundColor: c.cor }}
                        />
                      ))}
                    </div>
                    <textarea
                      value={obsEdit}
                      onChange={(e) => setObsEdit(e.target.value)}
                      placeholder="Sua observação (opcional)…"
                      rows={2}
                      className="resize-none rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm outline-none focus:border-mod-biblia"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditandoId(null)}
                        className="rounded-lg px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => salvar(m.id)}
                        disabled={salvando}
                        className="rounded-lg bg-mod-biblia/20 px-3 py-1.5 text-xs font-medium text-mod-biblia hover:bg-mod-biblia/30 disabled:opacity-50"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  m.observacao && (
                    <p className="mt-2 rounded-lg bg-black/20 px-2.5 py-1.5 text-sm text-muted">
                      {m.observacao}
                    </p>
                  )
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
