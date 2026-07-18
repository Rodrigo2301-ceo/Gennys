"use client";

import { useEffect, useState } from "react";
import type { Versao, Marcacao } from "./tipos";
import LeituraBiblia from "./LeituraBiblia";
import MinhasMarcacoes from "./MinhasMarcacoes";
import { CabecalhoTela } from "@/components/ui/base";

const BIBLIA = "#93c5fd"; // azul-claro (módulo Bíblia, CLAUDE.md)

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
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <span className="text-3xl">📖</span>
        <p className="font-medium text-mod-biblia">Bíblia ainda não importada</p>
        <p className="max-w-[240px] text-sm text-muted">
          Rode <code className="text-glow-blue">npm run seed:biblia</code> uma vez
          para carregar a Almeida 1911 (domínio público) no banco.
        </p>
      </div>
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

        <div className="ml-auto flex rounded-full border border-white/10 p-0.5 text-xs">
          <button
            onClick={() => setModo("ler")}
            className={`rounded-full px-3 py-1 font-medium transition ${
              modo === "ler"
                ? "bg-mod-biblia/20 text-mod-biblia"
                : "text-muted hover:text-foreground"
            }`}
          >
            Ler
          </button>
          <button
            onClick={() => setModo("marcacoes")}
            className={`rounded-full px-3 py-1 font-medium transition ${
              modo === "marcacoes"
                ? "bg-mod-biblia/20 text-mod-biblia"
                : "text-muted hover:text-foreground"
            }`}
          >
            Marcações
          </button>
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
