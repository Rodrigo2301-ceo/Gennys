"use client";

import { useEffect, useRef, useState } from "react";
import { Cerebro, Chevron, Check } from "@/components/ui/icones";
import type { AiProvider, AiProviderPublico } from "@/lib/ai/providers";

export default function SeletorModelo({
  provedorInicial,
  provedores,
  onProvedorAlterado,
}: {
  provedorInicial: AiProvider;
  provedores: AiProviderPublico[];
  onProvedorAlterado: (provider: AiProvider) => void;
}) {
  const [provedor, setProvedor] = useState<AiProvider>(provedorInicial);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  async function escolher(novo: AiProvider) {
    setAberto(false);
    if (novo === provedor) return;

    const anterior = provedor;
    setProvedor(novo); // otimista
    setSalvando(true);
    try {
      const res = await fetch("/api/conta", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiProvider: novo }),
      });
      if (!res.ok) throw new Error("falhou");
      onProvedorAlterado(novo);
    } catch {
      setProvedor(anterior); // desfaz em caso de erro
    } finally {
      setSalvando(false);
    }
  }

  const atual = provedores.find((p) => p.valor === provedor);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setAberto((v) => !v)}
        disabled={salvando || provedores.length === 0}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1 font-display text-lg font-bold tracking-tight text-white transition duration-200 hover:bg-white/10 disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={aberto}
      >
        <Cerebro size={18} className="text-glow-blue/80" />
        Gennys
        <Chevron
          size={14}
          className={`text-white/60 transition-transform duration-200 ${aberto ? "-rotate-90" : "rotate-90"}`}
        />
      </button>

      {aberto && provedores.length > 0 && (
        <div
          role="listbox"
          className="absolute left-1/2 top-full z-20 mt-2 w-44 -translate-x-1/2 rounded-xl border border-white/10 bg-royal-800 p-1.5 shadow-glow"
        >
          <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-medium uppercase tracking-wide text-muted">
            Cérebro do Gennys
          </p>
          {provedores.map((p) => (
            <button
              key={p.valor}
              role="option"
              aria-selected={p.valor === provedor}
              onClick={() => escolher(p.valor)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                p.valor === provedor
                  ? "text-glow-cyan"
                  : "text-foreground hover:bg-white/10"
              }`}
            >
              {p.label}
              {p.valor === provedor && <Check size={14} />}
            </button>
          ))}
        </div>
      )}

      <span className="sr-only" aria-live="polite">
        {salvando
          ? "Salvando escolha de modelo…"
          : atual
            ? `Modelo atual: ${atual.label}`
            : "Nenhum modelo de IA disponível"}
      </span>
    </div>
  );
}
