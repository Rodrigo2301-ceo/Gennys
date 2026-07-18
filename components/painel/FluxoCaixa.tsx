"use client";

import { useEffect, useState } from "react";
import type { EntryLike } from "@/lib/entryDisplay";
import { formatarReais } from "@/lib/entryDisplay";
import { Card, Eyebrow } from "@/components/ui/base";

// Fluxo de caixa: única viz nova, derivada das transações já registradas.
// Receita (lavanda, sólida, com fill) vs Despesa (coral, tracejada) por mês.
const IN = "#a5b4fc";
const OUT = "#fb7185";

function mesKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).format(new Date(iso));
}

function ultimosMeses(n: number): string[] {
  const d = new Date();
  const arr: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    arr.push(`${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}`);
  }
  return arr;
}

function mesLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(
    new Date(y, m - 1, 1),
  );
}

export default function FluxoCaixa() {
  const [entries, setEntries] = useState<EntryLike[] | null>(null);

  useEffect(() => {
    fetch("/api/entries?tipo=financa")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => setEntries([]));
  }, []);

  if (!entries) return null;
  const rele = entries.filter((e) => e.categoria !== "plano_reserva");
  if (rele.length === 0) return null;

  const meses = ultimosMeses(6);
  const receita = new Map(meses.map((m) => [m, 0]));
  const despesa = new Map(meses.map((m) => [m, 0]));
  for (const e of rele) {
    const k = mesKey(e.createdAt);
    if (!receita.has(k)) continue;
    const v = e.valor ? Number(e.valor) : 0;
    const dados = (e.dados ?? {}) as Record<string, unknown>;
    if (dados.movimento === "receita") receita.set(k, receita.get(k)! + v);
    else despesa.set(k, despesa.get(k)! + v);
  }

  const valsR = meses.map((m) => receita.get(m)!);
  const valsD = meses.map((m) => despesa.get(m)!);
  const max = Math.max(1, ...valsR, ...valsD);
  const totalR = valsR.reduce((a, b) => a + b, 0);
  const totalD = valsD.reduce((a, b) => a + b, 0);

  const W = 300;
  const H = 110;
  const pad = 8;
  const px = (i: number) =>
    meses.length === 1 ? W / 2 : pad + (i / (meses.length - 1)) * (W - 2 * pad);
  const py = (v: number) => H - 12 - (v / max) * (H - 26);
  const linha = (vals: number[]) =>
    vals
      .map((v, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(v).toFixed(1)}`)
      .join(" ");
  const areaR = `${linha(valsR)} L${px(meses.length - 1).toFixed(1)},${H - 12} L${px(0).toFixed(1)},${H - 12} Z`;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow>Fluxo de Caixa</Eyebrow>
        <div className="flex gap-3 text-[10px]">
          <span className="flex items-center gap-1" style={{ color: IN }}>
            <span className="h-2 w-2 rounded-full" style={{ background: IN }} />
            Ganhei
          </span>
          <span className="flex items-center gap-1" style={{ color: OUT }}>
            <span className="h-[2px] w-3" style={{ background: OUT }} />
            Gastei
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="fluxoFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={IN} stopOpacity="0.35" />
            <stop offset="100%" stopColor={IN} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaR} fill="url(#fluxoFill)" />
        <path d={linha(valsR)} fill="none" stroke={IN} strokeWidth="2" strokeLinejoin="round" />
        <path
          d={linha(valsD)}
          fill="none"
          stroke={OUT}
          strokeWidth="2"
          strokeDasharray="4 3"
          strokeLinejoin="round"
        />
        {meses.map((m, i) => (
          <g key={m}>
            <circle cx={px(i)} cy={py(valsR[i])} r="2.4" fill={IN} />
            <circle cx={px(i)} cy={py(valsD[i])} r="2.4" fill={OUT} />
          </g>
        ))}
      </svg>

      <div className="mt-1 flex justify-between text-[10px] capitalize text-muted">
        {meses.map((m) => (
          <span key={m}>{mesLabel(m)}</span>
        ))}
      </div>

      <div className="mt-2 flex justify-between text-xs tabular-nums">
        <span style={{ color: IN }}>+ {formatarReais(totalR)}</span>
        <span style={{ color: OUT }}>− {formatarReais(totalD)}</span>
      </div>
    </Card>
  );
}
