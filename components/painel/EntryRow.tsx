"use client";

import { useState, type ReactNode } from "react";
import {
  duracaoMinutosEntry,
  formatarData,
  formatarMinutos,
  formatarReais,
  horarioEntry,
  tituloEntry,
  type EntryLike,
} from "@/lib/entryDisplay";
import { Badge, IconeTile } from "@/components/ui/base";
import { Carteira, Tarefa, Repeticao, Livro, Check } from "@/components/ui/icones";

function iconePadrao(tipo: string): ReactNode {
  switch (tipo) {
    case "financa":
      return <Carteira size={18} />;
    case "tarefa":
      return <Tarefa size={18} />;
    case "estudo":
      return <Livro size={18} />;
    default:
      return <Repeticao size={18} />;
  }
}

export default function EntryRow({
  entry,
  mostrarValor,
  corAccent,
  icone,
  marcadoHoje = false,
  onSaved,
  onDeleted,
  onLockToggled,
}: {
  entry: EntryLike;
  mostrarValor: boolean;
  corAccent: string;
  icone?: ReactNode;
  marcadoHoje?: boolean;
  onSaved: (e: EntryLike) => void;
  onDeleted: (id: string) => void;
  onLockToggled: (e: EntryLike) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [categoria, setCategoria] = useState(entry.categoria ?? "");
  const [valor, setValor] = useState(
    entry.valor !== null ? String(entry.valor) : "",
  );
  const [horario, setHorario] = useState(horarioEntry(entry) ?? "");
  const [erro, setErro] = useState<string | null>(null);

  const despesaFixa = entry.tipo === "financa" && entry.locked;
  const geradaAutomaticamente = Boolean(entry.origemRecorrenteId);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      const dadosAtual = (entry.dados ?? {}) as Record<string, unknown>;
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria: categoria.trim() || null,
          valor: mostrarValor ? (valor ? Number(valor) : null) : undefined,
          dados: { ...dadosAtual, horario: horario.trim() || undefined },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Não foi possível salvar.");
      }
      const data = await res.json();
      onSaved(data.entry);
      setEditando(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!confirm("Excluir este registro?")) return;
    const res = await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(entry.id);
    else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Não foi possível excluir.");
    }
  }

  async function alternarTrava() {
    const res = await fetch(`/api/entries/${entry.id}/lock`, {
      method: "PATCH",
    });
    if (res.ok) {
      const data = await res.json();
      onLockToggled(data.entry);
    }
  }

  return (
    <li className="rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:border-white/20">
      {!editando ? (
        <div className="flex items-center gap-3">
          <IconeTile cor={corAccent}>{icone ?? iconePadrao(entry.tipo)}</IconeTile>

          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 truncate font-medium text-foreground">
              <span className="truncate">{tituloEntry(entry)}</span>
              {despesaFixa && <Badge cor={corAccent}>despesa fixa</Badge>}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted">
              {formatarData(entry.createdAt)}
              {horarioEntry(entry) && ` · ${horarioEntry(entry)}`}
              {duracaoMinutosEntry(entry) &&
                ` · ${formatarMinutos(duracaoMinutosEntry(entry)!)}`}
              {entry.tipo !== "estudo" &&
                entry.categoria &&
                ` · ${entry.categoria}`}
              {geradaAutomaticamente && ` · ${entry.mesReferencia}`}
            </p>
          </div>

          {mostrarValor && (
            <span
              className="shrink-0 font-medium tabular-nums"
              style={{ color: corAccent }}
            >
              {formatarReais(entry.valor)}
            </span>
          )}

          {marcadoHoje && (
            <span
              title="Registrado hoje"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
              style={{
                color: corAccent,
                backgroundColor: `${corAccent}22`,
                boxShadow: `0 0 12px -4px ${corAccent}`,
              }}
            >
              <Check size={13} />
            </span>
          )}

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              title={entry.locked ? "Destravar" : "Travar"}
              onClick={alternarTrava}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-white/10 hover:text-foreground"
            >
              {entry.locked ? <IconeCadeadoFechado /> : <IconeCadeadoAberto />}
            </button>
            <button
              type="button"
              title="Editar"
              disabled={entry.locked}
              onClick={() => setEditando(true)}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-white/10 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
            >
              <IconeEditar />
            </button>
            <button
              type="button"
              title="Excluir"
              disabled={entry.locked}
              onClick={excluir}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-mod-financa/20 hover:text-mod-financa disabled:cursor-not-allowed disabled:opacity-30"
            >
              <IconeLixeira />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Categoria"
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm outline-none focus:border-royal-500"
            />
            {mostrarValor ? (
              <input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Valor"
                inputMode="decimal"
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm tabular-nums outline-none focus:border-royal-500"
              />
            ) : (
              <input
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                placeholder="Horário (opcional)"
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm outline-none focus:border-royal-500"
              />
            )}
          </div>
          {erro && <p className="text-xs text-mod-financa">{erro}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-muted hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="rounded-lg bg-royal-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-royal-600 disabled:opacity-60"
            >
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function IconeCadeadoFechado() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
function IconeCadeadoAberto() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.4-2" />
    </svg>
  );
}
function IconeEditar() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
function IconeLixeira() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
