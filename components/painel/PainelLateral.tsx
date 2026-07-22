"use client";

import { useState, type ReactNode } from "react";
import AbaFinanceiro from "./AbaFinanceiro";
import AbaProdutividade from "./AbaProdutividade";
import AbaEstudos from "./AbaEstudos";
import AbaBiblia from "./biblia/AbaBiblia";
import AbaCerebro from "./AbaCerebro";
import AbaPerfil from "./AbaPerfil";
import { NavPill } from "@/components/ui/base";
import { Carteira, Repeticao, Grafico, Livro, Cerebro, Pessoa } from "@/components/ui/icones";

type AbaId =
  | "financeiro"
  | "produtividade"
  | "estudos"
  | "biblia"
  | "cerebro"
  | "perfil";

const ABAS: { id: AbaId; rotulo: string; icone: ReactNode }[] = [
  { id: "financeiro", rotulo: "Financeiro", icone: <Carteira size={16} /> },
  { id: "produtividade", rotulo: "Hábitos", icone: <Repeticao size={16} /> },
  { id: "estudos", rotulo: "Estudos", icone: <Grafico size={16} /> },
  { id: "biblia", rotulo: "Bíblia", icone: <Livro size={16} /> },
  { id: "cerebro", rotulo: "Cérebro", icone: <Cerebro size={16} /> },
  { id: "perfil", rotulo: "Perfil", icone: <Pessoa size={16} /> },
];

export default function PainelLateral({
  aberto,
  onFechar,
}: {
  aberto: boolean;
  onFechar: () => void;
}) {
  const [aba, setAba] = useState<AbaId>("financeiro");

  return (
    <>
      {/* Fundo escurecido */}
      <div
        onClick={onFechar}
        aria-hidden
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity ${
          aberto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Painel deslizante */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-full max-w-sm flex-col border-r border-white/10 bg-royal-800/95 backdrop-blur-xl transition-transform duration-300 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!aberto}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
          <span className="px-1 font-display text-lg font-bold tracking-tight text-glow-cyan">
            Gennys
          </span>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="grid h-11 w-11 place-items-center rounded-xl text-muted transition duration-200 hover:bg-white/10 hover:text-foreground active:scale-95"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-white/10 px-3 py-2.5">
          {ABAS.map((a) => (
            <NavPill
              key={a.id}
              icone={a.icone}
              ativo={aba === a.id}
              onClick={() => setAba(a.id)}
            >
              {a.rotulo}
            </NavPill>
          ))}
        </nav>

        <div key={aba} className="no-scrollbar aba-fade flex-1 overflow-y-auto p-4">
          {aba === "financeiro" && <AbaFinanceiro onRegistrar={onFechar} />}
          {aba === "produtividade" && <AbaProdutividade />}
          {aba === "estudos" && <AbaEstudos />}
          {aba === "biblia" && <AbaBiblia />}
          {aba === "cerebro" && <AbaCerebro />}
          {aba === "perfil" && <AbaPerfil />}
        </div>
      </aside>
    </>
  );
}
