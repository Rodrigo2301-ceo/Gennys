"use client";

import { useEffect, useMemo, useState } from "react";
import type { LivroBiblia, Marcacao } from "./tipos";
import { CORES_MARCA } from "./tipos";
import { Card, Eyebrow } from "@/components/ui/base";
import { Aspas } from "@/components/ui/icones";
import { cores } from "@/lib/theme";

const BIBLIA = cores.biblia; // azul-claro (módulo Bíblia, CLAUDE.md)

interface DadosCapitulo {
  livroCode: string;
  livroNome: string;
  capitulo: number;
  numCapitulos: number;
  versiculos: { numero: number; texto: string }[];
}

const FONTE_LEITURA = 'Georgia, "Times New Roman", serif';

export default function LeituraBiblia({
  versao,
  marcacoes,
  onMarcacoes,
}: {
  versao: string;
  marcacoes: Marcacao[];
  onMarcacoes: (m: Marcacao[]) => void;
}) {
  const [livros, setLivros] = useState<LivroBiblia[] | null>(null);
  const [filtro, setFiltro] = useState("");
  const [livroSel, setLivroSel] = useState<LivroBiblia | null>(null);
  const [capSel, setCapSel] = useState<number | null>(null);
  const [dadosCap, setDadosCap] = useState<DadosCapitulo | null>(null);
  const [carregandoCap, setCarregandoCap] = useState(false);

  // Editor de marcação
  const [versiculoSel, setVersiculoSel] = useState<number | null>(null);
  const [corEdit, setCorEdit] = useState(CORES_MARCA[0].cor);
  const [obsEdit, setObsEdit] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Carrega livros quando a versão muda; reseta navegação.
  useEffect(() => {
    setLivros(null);
    setLivroSel(null);
    setCapSel(null);
    setDadosCap(null);
    setVersiculoSel(null);
    if (!versao) return;
    fetch(`/api/biblia/livros?versao=${versao}`)
      .then((r) => r.json())
      .then((d) => setLivros(d.livros ?? []))
      .catch(() => setLivros([]));
  }, [versao]);

  // Carrega o capítulo selecionado.
  useEffect(() => {
    if (!livroSel || capSel === null) return;
    setCarregandoCap(true);
    setVersiculoSel(null);
    fetch(
      `/api/biblia/capitulo?versao=${versao}&livro=${livroSel.code}&cap=${capSel}`,
    )
      .then((r) => r.json())
      .then((d) => setDadosCap(d.error ? null : d))
      .finally(() => setCarregandoCap(false));
  }, [versao, livroSel, capSel]);

  // Marcações do capítulo atual: versículo -> marcação.
  const marcasDoCap = useMemo(() => {
    const map = new Map<number, Marcacao>();
    if (!livroSel || capSel === null) return map;
    for (const m of marcacoes) {
      if (
        m.translationCode === versao &&
        m.bookCode === livroSel.code &&
        m.chapter === capSel
      ) {
        map.set(m.verse, m);
      }
    }
    return map;
  }, [marcacoes, versao, livroSel, capSel]);

  function abrirEditor(numero: number) {
    const existente = marcasDoCap.get(numero);
    setVersiculoSel(numero);
    setCorEdit(existente?.cor ?? CORES_MARCA[0].cor);
    setObsEdit(existente?.observacao ?? "");
  }

  async function salvarMarca(numero: number, texto: string) {
    if (!livroSel || capSel === null) return;
    setSalvando(true);
    try {
      const res = await fetch("/api/biblia/marcacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versao,
          livroCode: livroSel.code,
          livroNome: dadosCap?.livroNome ?? livroSel.name,
          capitulo: capSel,
          versiculo: numero,
          texto,
          cor: corEdit,
          observacao: obsEdit,
        }),
      });
      const data = await res.json();
      if (res.ok && data.marcacao) {
        const nova: Marcacao = data.marcacao;
        const resto = marcacoes.filter(
          (m) =>
            !(
              m.translationCode === nova.translationCode &&
              m.bookCode === nova.bookCode &&
              m.chapter === nova.chapter &&
              m.verse === nova.verse
            ),
        );
        onMarcacoes([nova, ...resto]);
        setVersiculoSel(null);
      }
    } finally {
      setSalvando(false);
    }
  }

  async function removerMarca(numero: number) {
    const existente = marcasDoCap.get(numero);
    if (!existente) {
      setVersiculoSel(null);
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch(`/api/biblia/marcacoes/${existente.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onMarcacoes(marcacoes.filter((m) => m.id !== existente.id));
        setVersiculoSel(null);
      }
    } finally {
      setSalvando(false);
    }
  }

  // ---- Navegação: lista de livros ----
  if (!livroSel) {
    if (!livros) return <p className="text-sm text-muted">Carregando…</p>;

    const termo = filtro.trim().toLowerCase();
    const filtrados = termo
      ? livros.filter((l) => l.name.toLowerCase().includes(termo))
      : livros;
    const at = filtrados.filter((l) => l.testamento === "AT");
    const nt = filtrados.filter((l) => l.testamento === "NT");

    return (
      <div className="flex flex-col gap-3">
        {marcacoes.length > 0 && (
          <Card accent={BIBLIA} glow>
            <Eyebrow cor={BIBLIA}>Versículo em destaque</Eyebrow>
            <Aspas size={22} className="mt-1 text-mod-biblia" />
            <p className="mt-0.5 font-display text-lg font-bold leading-snug text-foreground">
              {marcacoes[0].texto}
            </p>
            <p className="mt-2 text-right text-xs text-mod-biblia">
              {marcacoes[0].bookName} {marcacoes[0].chapter}:{marcacoes[0].verse}
            </p>
          </Card>
        )}

        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar livro…"
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-mod-biblia"
        />
        {[
          { titulo: "Antigo Testamento", lista: at },
          { titulo: "Novo Testamento", lista: nt },
        ].map(
          (grupo) =>
            grupo.lista.length > 0 && (
              <div key={grupo.titulo}>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                  {grupo.titulo}
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {grupo.lista.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLivroSel(l);
                        setCapSel(null);
                        setDadosCap(null);
                      }}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-foreground transition hover:border-mod-biblia/40 hover:bg-mod-biblia/10"
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>
            ),
        )}
      </div>
    );
  }

  // ---- Navegação: grade de capítulos ----
  if (capSel === null) {
    return (
      <div className="flex flex-col gap-3">
        <Voltar
          onClick={() => setLivroSel(null)}
          rotulo="Livros"
          titulo={livroSel.name}
        />
        <div className="grid grid-cols-6 gap-1.5">
          {Array.from({ length: livroSel.numCapitulos }, (_, i) => i + 1).map(
            (n) => (
              <button
                key={n}
                onClick={() => setCapSel(n)}
                className="aspect-square rounded-lg border border-white/10 bg-white/5 text-sm text-foreground transition hover:border-mod-biblia/40 hover:bg-mod-biblia/10"
              >
                {n}
              </button>
            ),
          )}
        </div>
      </div>
    );
  }

  // ---- Leitura ----
  return (
    <div className="flex flex-col gap-3">
      <Voltar
        onClick={() => {
          setCapSel(null);
          setDadosCap(null);
        }}
        rotulo="Capítulos"
        titulo={`${livroSel.name} ${capSel}`}
      />

      {carregandoCap || !dadosCap ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : (
        <>
          <div
            className="flex flex-col gap-1 leading-relaxed"
            style={{ fontFamily: FONTE_LEITURA }}
          >
            {dadosCap.versiculos.map((v) => {
              const marca = marcasDoCap.get(v.numero);
              const editando = versiculoSel === v.numero;
              return (
                <div key={v.numero}>
                  <p
                    onClick={() => abrirEditor(v.numero)}
                    className="cursor-pointer rounded-md px-2 py-1 text-[15px] text-foreground transition hover:bg-white/5"
                    style={
                      marca
                        ? {
                            backgroundColor: `${marca.cor}22`,
                            boxShadow: `inset 3px 0 0 ${marca.cor}`,
                          }
                        : undefined
                    }
                  >
                    <sup className="mr-1 select-none text-[11px] font-sans text-mod-biblia">
                      {v.numero}
                    </sup>
                    {v.texto}
                  </p>

                  {editando && (
                    <EditorMarca
                      cor={corEdit}
                      onCor={setCorEdit}
                      observacao={obsEdit}
                      onObservacao={setObsEdit}
                      temMarca={!!marca}
                      salvando={salvando}
                      onSalvar={() => salvarMarca(v.numero, v.texto)}
                      onRemover={() => removerMarca(v.numero)}
                      onCancelar={() => setVersiculoSel(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Navegação de capítulos */}
          <div className="mt-2 flex items-center justify-between">
            <button
              disabled={capSel <= 1}
              onClick={() => setCapSel(capSel - 1)}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-muted transition enabled:hover:text-foreground disabled:opacity-30"
            >
              ← Anterior
            </button>
            <span className="text-xs text-muted">
              {capSel} / {dadosCap.numCapitulos}
            </span>
            <button
              disabled={capSel >= dadosCap.numCapitulos}
              onClick={() => setCapSel(capSel + 1)}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-muted transition enabled:hover:text-foreground disabled:opacity-30"
            >
              Próximo →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Voltar({
  onClick,
  rotulo,
  titulo,
}: {
  onClick: () => void;
  rotulo: string;
  titulo: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onClick}
        className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-muted transition hover:text-foreground"
      >
        ← {rotulo}
      </button>
      <span className="text-sm font-medium text-mod-biblia">{titulo}</span>
    </div>
  );
}

function EditorMarca({
  cor,
  onCor,
  observacao,
  onObservacao,
  temMarca,
  salvando,
  onSalvar,
  onRemover,
  onCancelar,
}: {
  cor: string;
  onCor: (c: string) => void;
  observacao: string;
  onObservacao: (o: string) => void;
  temMarca: boolean;
  salvando: boolean;
  onSalvar: () => void;
  onRemover: () => void;
  onCancelar: () => void;
}) {
  return (
    <div className="my-1 flex flex-col gap-2 rounded-xl border border-white/10 bg-royal-800/80 p-3 font-sans">
      <div className="flex items-center gap-2">
        {CORES_MARCA.map((c) => (
          <button
            key={c.cor}
            title={c.nome}
            onClick={() => onCor(c.cor)}
            className={`h-6 w-6 rounded-full transition ${
              cor === c.cor ? "ring-2 ring-white ring-offset-2 ring-offset-royal-800" : ""
            }`}
            style={{ backgroundColor: c.cor }}
          />
        ))}
      </div>
      <textarea
        value={observacao}
        onChange={(e) => onObservacao(e.target.value)}
        placeholder="Sua observação (opcional)…"
        rows={2}
        className="resize-none rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm outline-none focus:border-mod-biblia"
      />
      <div className="flex items-center justify-end gap-2">
        {temMarca && (
          <button
            onClick={onRemover}
            disabled={salvando}
            className="mr-auto rounded-lg px-2.5 py-1.5 text-xs text-mod-financa hover:underline disabled:opacity-50"
          >
            Remover
          </button>
        )}
        <button
          onClick={onCancelar}
          className="rounded-lg px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
        >
          Cancelar
        </button>
        <button
          onClick={onSalvar}
          disabled={salvando}
          className="rounded-lg bg-mod-biblia/20 px-3 py-1.5 text-xs font-medium text-mod-biblia transition hover:bg-mod-biblia/30 disabled:opacity-50"
        >
          {temMarca ? "Atualizar" : "Marcar"}
        </button>
      </div>
    </div>
  );
}
