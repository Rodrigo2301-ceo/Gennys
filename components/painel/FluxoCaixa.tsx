"use client";

import { useEffect, useId, useState } from "react";
import type { EntryLike } from "@/lib/entryDisplay";
import {
  deduplicarEntriesFinanceiras,
  formatarReais,
  mesReferenciaEntry,
  movimentoEntry,
} from "@/lib/entryDisplay";
import { parseMesCivil, ultimosMesesCivis } from "@/lib/finance/datas";
import { Card, Eyebrow } from "@/components/ui/base";
import { cores } from "@/lib/theme";

const IN = cores.dataIn;
const OUT = cores.dataOut;

function mesLabel(key: string): string {
  const partes = parseMesCivil(key);
  if (!partes) return key;
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(partes.ano, partes.mes - 1, 1)));
}

export default function FluxoCaixa() {
  const [entries, setEntries] = useState<EntryLike[] | null>(null);
  const [erro, setErro] = useState(false);
  const tituloId = useId();
  const descricaoId = useId();
  const gradienteId = useId().replace(/:/g, "");

  useEffect(() => {
    let ativo = true;
    fetch("/api/entries?tipo=financa")
      .then(async (res) => {
        if (!res.ok) throw new Error("Falha ao carregar fluxo.");
        return res.json();
      })
      .then((dados) => ativo && setEntries(dados.entries ?? []))
      .catch(() => ativo && setErro(true));
    return () => {
      ativo = false;
    };
  }, []);

  if (erro) {
    return (
      <p className="text-sm text-mod-financa" role="alert">
        Nao foi possivel carregar o fluxo de caixa.
      </p>
    );
  }
  if (!entries) return <p className="sr-only" role="status">Carregando fluxo de caixa.</p>;

  const relevantes = deduplicarEntriesFinanceiras(entries).filter(
    (entry) =>
      !entry.excludeFromTotals && entry.categoria !== "plano_reserva",
  );
  if (relevantes.length === 0) return null;

  const meses = ultimosMesesCivis(6);
  const receita = new Map(meses.map((mes) => [mes, 0]));
  const despesa = new Map(meses.map((mes) => [mes, 0]));
  for (const entry of relevantes) {
    const mes = mesReferenciaEntry(entry);
    if (!receita.has(mes)) continue;
    const valor = Math.abs(Number(entry.valor) || 0);
    const mapa = movimentoEntry(entry) === "receita" ? receita : despesa;
    mapa.set(mes, mapa.get(mes)! + valor);
  }

  const valsR = meses.map((mes) => receita.get(mes)!);
  const valsD = meses.map((mes) => despesa.get(mes)!);
  const max = Math.max(1, ...valsR, ...valsD);
  const totalR = valsR.reduce((a, b) => a + b, 0);
  const totalD = valsD.reduce((a, b) => a + b, 0);

  const W = 300;
  const H = 110;
  const pad = 8;
  const px = (indice: number) =>
    meses.length === 1
      ? W / 2
      : pad + (indice / (meses.length - 1)) * (W - 2 * pad);
  const py = (valor: number) => H - 12 - (valor / max) * (H - 26);
  const linha = (valores: number[]) =>
    valores
      .map(
        (valor, indice) =>
          `${indice === 0 ? "M" : "L"}${px(indice).toFixed(1)},${py(valor).toFixed(1)}`,
      )
      .join(" ");
  const areaR = `${linha(valsR)} L${px(meses.length - 1).toFixed(1)},${H - 12} L${px(0).toFixed(1)},${H - 12} Z`;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow>Fluxo de Caixa</Eyebrow>
        <div className="flex gap-3 text-[10px]" aria-hidden>
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

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-labelledby={`${tituloId} ${descricaoId}`}
      >
        <title id={tituloId}>Receitas e despesas por mes</title>
        <desc id={descricaoId}>
          Comparacao dos ultimos seis meses pela data real da transacao.
        </desc>
        <defs>
          <linearGradient id={gradienteId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={IN} stopOpacity="0.35" />
            <stop offset="100%" stopColor={IN} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaR} fill={`url(#${gradienteId})`} />
        <path d={linha(valsR)} fill="none" stroke={IN} strokeWidth="2" strokeLinejoin="round" />
        <path
          d={linha(valsD)}
          fill="none"
          stroke={OUT}
          strokeWidth="2"
          strokeDasharray="4 3"
          strokeLinejoin="round"
        />
        {meses.map((mes, indice) => (
          <g key={mes} aria-hidden>
            <circle cx={px(indice)} cy={py(valsR[indice])} r="2.4" fill={IN} />
            <circle cx={px(indice)} cy={py(valsD[indice])} r="2.4" fill={OUT} />
          </g>
        ))}
      </svg>

      <div className="mt-1 flex justify-between text-[10px] capitalize text-muted" aria-hidden>
        {meses.map((mes) => (
          <span key={mes}>{mesLabel(mes)}</span>
        ))}
      </div>

      <ul className="sr-only">
        {meses.map((mes, indice) => (
          <li key={mes}>
            {mesLabel(mes)}: receitas {formatarReais(valsR[indice])}; despesas{" "}
            {formatarReais(valsD[indice])}.
          </li>
        ))}
      </ul>

      <div className="mt-2 flex justify-between text-xs tabular-nums">
        <span style={{ color: IN }}>+ {formatarReais(totalR)}</span>
        <span style={{ color: OUT }}>- {formatarReais(totalD)}</span>
      </div>
    </Card>
  );
}
