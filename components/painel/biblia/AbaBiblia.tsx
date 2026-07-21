"use client";

import { useEffect, useState } from "react";
import type { Versao, Marcacao } from "./tipos";
import LeituraBiblia from "./LeituraBiblia";
import MinhasMarcacoes from "./MinhasMarcacoes";
import { CabecalhoTela, EmptyState, NavPill } from "@/components/ui/base";
import { Livro } from "@/components/ui/icones";
import { cores } from "@/lib/theme";

const BIBLIA = cores.biblia; // azul-claro (módulo Bíblia, CLAUDE.md)

type Modo = "ler" | "marcacoes";

export default function AbaBiblia() {
  const [versoes, setVersoes] = useState<Versao[] | null>(null);
  const [versao, setVersao] = useState<string>("");
  const [modo, setModo] = useState<Modo>("ler");
  const [marcacoes, setMarcacoes] = useState<Marcacao[]>([]);

  useEffect(() => {
    fetch("/api/biblia/versoes")
      .then((r) => r.json())
      .then((d) => {
        const vs: Versao[] = d.versoes ?? [];
        setVersoes(vs);
        if (vs.length > 0) setVersao(vs[0].code);
      })
      .catch(() => setVersoes([]));

    fetch("/api/biblia/marcacoes")
      .then((r) => r.json())
      .then((d) => setMarcacoes(d.marcacoes ?? []))
      .catch(() => setMarcacoes([]));
  }, []);

  if (!versoes) {
    return <p className="text-sm text-muted">Carregando…</p>;
  }

  if (versoes.length === 0) {
    return (
      <EmptyState icone={<Livro size={26} />} titulo="Bíblia a caminho">
        A Almeida 1911 (domínio público) ainda está sendo preparada por aqui.
        Volte em instantes pra ler e marcar seus versículos favoritos.
        {process.env.NODE_ENV === "development" && (
          <span className="mt-2 block text-xs text-muted/70">
            dev: rode <code className="text-glow-blue">npm run seed:biblia</code>
          </span>
        )}
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoTela
        eyebrow="Espaço Espiritual"
        eyebrowCor={BIBLIA}
        titulo="Bíblia"
      />

      {/* Seletor de versão + alternância de modo (nav-pill) */}
      <div className="flex items-center gap-2">
        <select
          value={versao}
          onChange={(e) => setVersao(e.target.value)}
          className="rounded-xl border border-white/10 bg-royal-800 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-mod-biblia [color-scheme:dark]"
        >
          {versoes.map((v) => (
            <option key={v.code} value={v.code}>
              {v.name}
            </option>
          ))}
        </select>

        <div className="ml-auto flex gap-1">
          <NavPill ativo={modo === "ler"} onClick={() => setModo("ler")}>
            Ler
          </NavPill>
          <NavPill
            ativo={modo === "marcacoes"}
            onClick={() => setModo("marcacoes")}
          >
            Marcações
          </NavPill>
        </div>
      </div>

      {modo === "ler" ? (
        <LeituraBiblia
          versao={versao}
          marcacoes={marcacoes}
          onMarcacoes={setMarcacoes}
        />
      ) : (
        <MinhasMarcacoes marcacoes={marcacoes} onMarcacoes={setMarcacoes} />
      )}
    </div>
  );
}
