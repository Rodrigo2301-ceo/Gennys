"use client";

import { useState, type ReactNode } from "react";
import AbaFinanceiro from "./AbaFinanceiro";
import AbaProdutividade from "./AbaProdutividade";
import AbaEstudos from "./AbaEstudos";
import AbaBiblia from "./biblia/AbaBiblia";
import AbaCerebro from "./AbaCerebro";
import ExcluirConta from "./ExcluirConta";
import { Carteira, Repeticao, Grafico, Livro, Cerebro } from "@/components/ui/icones";

type AbaId = "financeiro" | "produtividade" | "estudos" | "biblia" | "cerebro";

const ABAS: { id: AbaId; rotulo: string; icone: ReactNode }[] = [
  { id: "financeiro", rotulo: "Financeiro", icone: <Carteira size={16} /> },
  { id: "produtividade", rotulo: "Hábitos", icone: <Repeticao size={16} /> },
  { id: "estudos", rotulo: "Estudos", icone: <Grafico size={16} /> },
  { id: "biblia", rotulo: "Bíblia", icone: <Livro size={16} /> },
  { id: "cerebro", rotulo: "Cérebro", icone: <Cerebro size={16} /> },
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
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <span className="font-display text-lg font-bold tracking-tight text-glow-cyan">
            Gennys
          </span>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-white/10 hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <nav className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-white/10 px-3 py-2.5">
          {ABAS.map((a) => {
            const ativa = aba === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setAba(a.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  ativa
                    ? "bg-royal-500/25 text-foreground"
                    : "text-muted hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <span className={ativa ? "text-glow-blue" : ""}>{a.icone}</span>
                {a.rotulo}
              </button>
            );
          })}
        </nav>

        <div className="no-scrollbar flex-1 overflow-y-auto p-4">
          {aba === "financeiro" && <AbaFinanceiro onRegistrar={onFechar} />}
          {aba === "produtividade" && <AbaProdutividade />}
          {aba === "estudos" && <AbaEstudos />}
          {aba === "biblia" && <AbaBiblia />}
          {aba === "cerebro" && <AbaCerebro />}
        </div>

        <div className="border-t border-white/10 p-4">
          <ExcluirConta />
        </div>
      </aside>
    </>
  );
}
