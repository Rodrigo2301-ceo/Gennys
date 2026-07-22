"use client";

import { useEffect, useState } from "react";
import { formatarReais } from "@/lib/entryDisplay";
import { Card, Eyebrow, HeroNumero } from "@/components/ui/base";
import { cores } from "@/lib/theme";

const AMBER = cores.financa;

interface Resumo {
  saldoAcumulado?: number;
  patrimonio: number;
  receitaMes: number;
  despesaMes: number;
  saldoMes: number;
}

// Resumo "como estou hoje": patrimônio acumulado + fluxo do mês.
export default function ResumoPatrimonio() {
  const [resumo, setResumo] = useState<Resumo | null>(null);

  useEffect(() => {
    fetch("/api/reserva")
      .then((r) => r.json())
      .then((d) => setResumo(d.resumo ?? null))
      .catch(() => setResumo(null));
  }, []);

  if (!resumo) {
    return (
      <Card>
        <span className="sr-only" role="status">
          Carregando resumo financeiro.
        </span>
        <div className="h-16 animate-pulse rounded bg-white/5" aria-hidden />
      </Card>
    );
  }

  const saldoPositivo = resumo.saldoMes >= 0;

  return (
    <Card accent={AMBER} glow>
      <Eyebrow cor={AMBER}>Saldo acumulado</Eyebrow>
      <div className="mt-1.5 flex items-end gap-2">
        <HeroNumero cor={AMBER}>
          {formatarReais(resumo.saldoAcumulado ?? resumo.patrimonio)}
        </HeroNumero>
        <span className="mb-1 text-xs text-muted">acumulado</span>
      </div>

      {/* Fluxo do mês: receita (verde) · despesa (vermelho) · saldo */}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
        <FluxoItem rotulo="Ganhei" valor={resumo.receitaMes} cor={cores.income} />
        <FluxoItem rotulo="Gastei" valor={resumo.despesaMes} cor={cores.expense} />
        <FluxoItem
          rotulo="Sobra"
          valor={resumo.saldoMes}
          cor={saldoPositivo ? cores.income : cores.expense}
          sinal
        />
      </div>
    </Card>
  );
}

function FluxoItem({
  rotulo,
  valor,
  cor,
  sinal = false,
}: {
  rotulo: string;
  valor: number;
  cor: string;
  sinal?: boolean;
}) {
  const prefixo = sinal ? (valor >= 0 ? "+" : "−") : "";
  const abs = Math.abs(valor);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
        {rotulo}
      </span>
      <span
        className="font-mono text-sm font-semibold tabular-nums"
        style={{ color: cor }}
      >
        {prefixo}
        {formatarReais(abs)}
      </span>
    </div>
  );
}
