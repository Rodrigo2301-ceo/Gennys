"use client";

import { useEffect, useState } from "react";
import { formatarReais } from "@/lib/entryDisplay";
import { CORES_MODULO } from "@/lib/modules";
import {
  Botao,
  Card,
  Chip,
  Eyebrow,
  HeroNumero,
  SecaoTitulo,
} from "@/components/ui/base";
import { Alvo } from "@/components/ui/icones";

const AMBER = CORES_MODULO.financa; // #f59e0b

interface PlanoDados {
  objetivo: string;
  metaValor: number | null;
  valorMensal: number;
  prazoMeses: number | null;
  modo: "manual" | "sugestao";
}

interface DadosReserva {
  media: { receitaMedia: number; despesaMedia: number; mesesConsiderados: number };
  sugestaoValorMensal: number;
  sugestaoMetaEmergencia: number;
  plano: { dados: PlanoDados } | null;
}

export default function PlanoReserva() {
  const [dados, setDados] = useState<DadosReserva | null>(null);
  const [editando, setEditando] = useState(false);
  const [objetivo, setObjetivo] = useState("");
  const [metaValor, setMetaValor] = useState("");
  const [modo, setModo] = useState<"manual" | "sugestao">("sugestao");
  const [valorManual, setValorManual] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState<string | null>(null);
  const [perguntando, setPerguntando] = useState(false);

  function carregar() {
    fetch("/api/reserva")
      .then((r) => r.json())
      .then((d) => {
        setDados(d);
        if (!d.plano) setEditando(true);
      });
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvar() {
    if (!objetivo.trim()) {
      setErro("Descreva seu objetivo (ex.: reserva de emergência).");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch("/api/reserva", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objetivo,
          metaValor: metaValor ? Number(metaValor) : null,
          modo,
          valorManual: valorManual ? Number(valorManual) : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Não foi possível salvar o plano.");
      }
      setEditando(false);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function perguntar() {
    if (!pergunta.trim()) return;
    setPerguntando(true);
    setResposta(null);
    try {
      const res = await fetch("/api/reserva/perguntar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta }),
      });
      const data = await res.json();
      setResposta(res.ok ? data.resposta : data.error);
    } catch {
      setResposta("Falha de conexão.");
    } finally {
      setPerguntando(false);
    }
  }

  if (!dados) return <p className="text-sm text-muted">Carregando…</p>;

  const plano = dados.plano?.dados;

  return (
    <div className="flex flex-col gap-3">
      {plano && !editando ? (
        <>
          {/* Hero da meta */}
          <Card accent={AMBER} glow>
            <div className="flex items-center gap-2">
              <Alvo size={14} className="text-mod-financa" />
              <Eyebrow cor={AMBER}>Minha meta</Eyebrow>
            </div>
            <div className="mt-1.5 flex items-end gap-2">
              <HeroNumero cor={AMBER}>
                {formatarReais(plano.metaValor ?? plano.valorMensal)}
              </HeroNumero>
              <span className="mb-1 text-xs text-muted">
                {plano.metaValor ? "meta" : "por mês"}
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-muted">{plano.objetivo}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {plano.metaValor ? (
                <Chip>{formatarReais(plano.valorMensal)}/mês</Chip>
              ) : null}
              {plano.prazoMeses ? <Chip>~{plano.prazoMeses} meses</Chip> : null}
            </div>
          </Card>

          {/* Roteiro (timeline) */}
          <Card>
            <SecaoTitulo>Meu roteiro</SecaoTitulo>
            <Roteiro plano={plano} />
            <div className="mt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="text-xs text-glow-blue hover:underline"
              >
                Ajustar estratégia
              </button>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <Eyebrow cor={AMBER}>Plano de reserva</Eyebrow>
          <p className="mt-1 text-xs text-muted">
            Média (últimos meses): receita{" "}
            <span className="tabular-nums">
              {formatarReais(dados.media.receitaMedia)}
            </span>{" "}
            · despesa{" "}
            <span className="tabular-nums">
              {formatarReais(dados.media.despesaMedia)}
            </span>
          </p>

          <div className="mt-3 flex flex-col gap-2.5">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Objetivo (reserva ou meta)</span>
              <input
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                placeholder="Ex.: reserva de emergência, viagem, moto…"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-royal-500"
              />
            </label>

            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => setModo("sugestao")}
                className={`flex-1 rounded-lg border px-3 py-2 transition ${
                  modo === "sugestao"
                    ? "border-mod-financa bg-mod-financa/15 text-foreground"
                    : "border-white/10 bg-white/5 text-muted"
                }`}
              >
                Sugestão ({formatarReais(dados.sugestaoValorMensal)}/mês)
              </button>
              <button
                type="button"
                onClick={() => setModo("manual")}
                className={`flex-1 rounded-lg border px-3 py-2 transition ${
                  modo === "manual"
                    ? "border-mod-financa bg-mod-financa/15 text-foreground"
                    : "border-white/10 bg-white/5 text-muted"
                }`}
              >
                Definir valor
              </button>
            </div>

            {modo === "manual" && (
              <input
                value={valorManual}
                onChange={(e) => setValorManual(e.target.value)}
                placeholder="Quanto guardar por mês (R$)"
                inputMode="decimal"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm tabular-nums outline-none focus:border-royal-500"
              />
            )}

            <input
              value={metaValor}
              onChange={(e) => setMetaValor(e.target.value)}
              placeholder={`Meta em R$ (opcional — sugestão: ${formatarReais(dados.sugestaoMetaEmergencia)})`}
              inputMode="decimal"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm tabular-nums outline-none focus:border-royal-500"
            />

            {erro && <p className="text-xs text-mod-financa">{erro}</p>}

            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="rounded-xl bg-mod-financa px-3 py-2.5 text-sm font-medium text-royal-900 shadow-glowAccent transition hover:brightness-110 disabled:opacity-60"
            >
              {salvando ? "Salvando…" : "Salvar plano"}
            </button>
          </div>
        </Card>
      )}

      {/* Pergunta livre (mantém a regra anti-investimento do motor) */}
      <Card>
        <Eyebrow>Pergunte ao Gennys</Eyebrow>
        <p className="mt-1 text-xs text-muted">
          Ex.: &quot;onde invisto esse dinheiro?&quot;
        </p>
        <div className="mt-2 flex gap-2">
          <input
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && perguntar()}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-royal-500"
            placeholder="Sua pergunta…"
          />
          <Botao onClick={perguntar} disabled={perguntando}>
            {perguntando ? "…" : "Perguntar"}
          </Botao>
        </div>
        {resposta && (
          <p className="mt-2 rounded-lg bg-white/5 p-2.5 text-sm text-foreground">
            {resposta}
          </p>
        )}
      </Card>
    </div>
  );
}

function Roteiro({ plano }: { plano: PlanoDados }) {
  const passos: { titulo: string; detalhe: string | null; estado: "concluido" | "andamento" | "pendente" }[] = [
    { titulo: "Objetivo definido", detalhe: plano.objetivo, estado: "concluido" },
    {
      titulo: `Guardar ${formatarReais(plano.valorMensal)}/mês`,
      detalhe: plano.modo === "sugestao" ? "sugestão do Gennys" : "definido por você",
      estado: "andamento",
    },
  ];
  if (plano.metaValor) {
    passos.push({
      titulo: `Alcançar ${formatarReais(plano.metaValor)}`,
      detalhe: plano.prazoMeses ? `~${plano.prazoMeses} meses` : null,
      estado: "pendente",
    });
  }

  return (
    <div className="flex flex-col">
      {passos.map((p, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <Ponto estado={p.estado} />
            {i < passos.length - 1 && <span className="w-px flex-1 bg-white/10" />}
          </div>
          <div className={i < passos.length - 1 ? "pb-3" : ""}>
            <p className="text-sm text-foreground">{p.titulo}</p>
            {p.detalhe && <p className="text-xs text-muted">{p.detalhe}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function Ponto({ estado }: { estado: "concluido" | "andamento" | "pendente" }) {
  if (estado === "concluido") {
    return (
      <span
        className="mt-1 h-3 w-3 shrink-0 rounded-full"
        style={{ background: AMBER, boxShadow: `0 0 8px -1px ${AMBER}` }}
      />
    );
  }
  if (estado === "andamento") {
    return (
      <span
        className="mt-1 h-3 w-3 shrink-0 rounded-full border-2"
        style={{ borderColor: AMBER }}
      />
    );
  }
  return <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-white/20" />;
}
