"use client";

import { useEffect, useState } from "react";
import EntryRow from "./EntryRow";
import { EmptyState } from "@/components/ui/base";
import type { EntryLike } from "@/lib/entryDisplay";

export default function ListaRegistros({
  tipo,
  corAccent,
  mostrarValor,
  filtro,
  vazio = "Nada por aqui ainda.",
  onCarregado,
}: {
  tipo: "financa" | "tarefa" | "nota" | "habito" | "estudo";
  corAccent: string;
  mostrarValor: boolean;
  filtro?: (e: EntryLike) => boolean;
  vazio?: string;
  onCarregado?: (entries: EntryLike[]) => void;
}) {
  const [entries, setEntries] = useState<EntryLike[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    fetch(`/api/entries?tipo=${tipo}`)
      .then((r) => r.json())
      .then((data) => {
        if (!ativo) return;
        const lista: EntryLike[] = data.entries ?? [];
        setEntries(lista);
        onCarregado?.(lista);
      })
      .catch(() => ativo && setErro("Não foi possível carregar."));
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  if (erro) return <p className="text-sm text-mod-financa">{erro}</p>;
  if (!entries) return <p className="text-sm text-muted">Carregando…</p>;

  const visiveis = filtro ? entries.filter(filtro) : entries;
  if (visiveis.length === 0) {
    return <EmptyState compacto titulo={vazio} />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {visiveis.map((e) => (
        <EntryRow
          key={e.id}
          entry={e}
          mostrarValor={mostrarValor}
          corAccent={corAccent}
          onSaved={(atualizado) =>
            setEntries((prev) =>
              (prev ?? []).map((p) => (p.id === atualizado.id ? atualizado : p)),
            )
          }
          onDeleted={(id) =>
            setEntries((prev) => (prev ?? []).filter((p) => p.id !== id))
          }
          onLockToggled={(atualizado) =>
            setEntries((prev) =>
              (prev ?? []).map((p) => (p.id === atualizado.id ? atualizado : p)),
            )
          }
        />
      ))}
    </ul>
  );
}
