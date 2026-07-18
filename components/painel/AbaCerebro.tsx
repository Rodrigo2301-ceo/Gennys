"use client";

import { useEffect, useState } from "react";
import GrafoCerebro from "./cerebro/GrafoCerebro";

interface Memoria {
  id: string;
  fato: string;
  categoria: string | null;
  createdAt: string;
}

type Modo = "grafo" | "lista";

export default function AbaCerebro() {
  const [modo, setModo] = useState<Modo>("grafo");
  const [memorias, setMemorias] = useState<Memoria[] | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [fatoEdit, setFatoEdit] = useState("");

  useEffect(() => {
    fetch("/api/memories")
      .then((r) => r.json())
      .then((d) => setMemorias(d.memories ?? []))
      .catch(() => setMemorias([]));
  }, []);

  async function salvar(id: string) {
    if (!fatoEdit.trim()) return;
    const res = await fetch(`/api/memories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fato: fatoEdit }),
    });
    if (res.ok) {
      const data = await res.json();
      setMemorias((prev) =>
        (prev ?? []).map((m) => (m.id === id ? data.memory : m)),
      );
      setEditandoId(null);
    }
  }

  async function apagar(id: string) {
    if (!confirm("Apagar esta memória? O Gennys vai esquecer esse fato.")) return;
    const res = await fetch(`/api/memories/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMemorias((prev) => (prev ?? []).filter((m) => m.id !== id));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {modo === "grafo"
            ? "O mapa da sua vida: cada registro é um átomo, agrupado por área."
            : "Tudo que o Gennys guardou sobre você. Edite ou apague à vontade."}
        </p>
        <div className="flex shrink-0 rounded-lg border border-white/10 p-0.5 text-xs">
          <button
            onClick={() => setModo("grafo")}
            className={`rounded-md px-2.5 py-1 transition ${
              modo === "grafo"
                ? "bg-royal-500/25 text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            Grafo
          </button>
          <button
            onClick={() => setModo("lista")}
            className={`rounded-md px-2.5 py-1 transition ${
              modo === "lista"
                ? "bg-royal-500/25 text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            Memórias
          </button>
        </div>
      </div>

      {modo === "grafo" ? (
        <GrafoCerebro />
      ) : !memorias ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : memorias.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma memória guardada ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {memorias.map((m) => (
            <li
              key={m.id}
              className="rounded-xl border border-white/10 bg-white/5 p-3"
            >
              {editandoId === m.id ? (
                <div className="flex flex-col gap-2">
                  <input
                    value={fatoEdit}
                    onChange={(e) => setFatoEdit(e.target.value)}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm outline-none focus:border-royal-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditandoId(null)}
                      className="rounded-lg px-3 py-1.5 text-xs text-muted hover:text-foreground"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => salvar(m.id)}
                      className="rounded-lg bg-royal-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-royal-600"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{m.fato}</p>
                    {m.categoria && (
                      <p className="mt-0.5 text-xs text-muted">{m.categoria}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      title="Editar"
                      onClick={() => {
                        setEditandoId(m.id);
                        setFatoEdit(m.fato);
                      }}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-white/10 hover:text-foreground"
                    >
                      ✎
                    </button>
                    <button
                      title="Apagar"
                      onClick={() => apagar(m.id)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-mod-financa/20 hover:text-mod-financa"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
