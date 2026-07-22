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
  ProgressBar,
  SecaoTitulo,
} from "@/components/ui/base";
import { Alvo } from "@/components/ui/icones";
import {
  deslocarMesCivil,
  mesesAteMesCivil,
  mesCivilSaoPaulo,
} from "@/lib/finance/datas";

const AMBER = CORES_MODULO.financa; // #f59e0b

type Modo = "sugestao" | "prazo" | "manual";

interface PlanoDados {
  objetivo: string;
  metaValor: number | null;
  valorMensal: number;
  prazoMeses: number | null;
  dataAlvo: string | null;
  modo: Modo;
  valorGuardado?: number;
}

interface DadosReserva {
  media: { receitaMedia: number; despesaMedia: number; mesesConsiderados: number };
  resumo: { saldoAcumulado?: number; patrimonio: number } | null;
  sugestaoValorMensal: number;
  sugestaoMetaEmergencia: number;
  mesesReservaEmergencia: number;
  plano: { dados: PlanoDados } | null;
}

// "YYYY-MM" do mês seguinte, como valor mínimo padrão do seletor de data-alvo.
function proximoMesISO(): string {
  return deslocarMesCivil(mesCivilSaoPaulo(), 1);
}

function mesesAteISO(dataAlvo: string): number | null {
  return mesesAteMesCivil(dataAlvo);
}

export default function PlanoReserva({
  onRegistrar,
}: {
  onRegistrar?: () => void;
}) {
  const [dados, setDados] = useState<DadosReserva | null>(null);
  const [editando, setEditando] = useState(false);
  const [objetivo, setObjetivo] = useState("");
  const [metaValor, setMetaValor] = useState("");
  const [modo, setModo] = useState<Modo>("sugestao");
  const [valorManual, setValorManual] = useState("");
  const [dataAlvo, setDataAlvo] = useState("");
  const [valorGuardado, setValorGuardado] = useState("0");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState<string | null>(null);
  const [perguntando, setPerguntando] = useState(false);
  const [erroPergunta, setErroPergunta] = useState(false);

  function carregar() {
    fetch("/api/reserva")
      .then((r) => r.json())
      .then((d) => {
        setDados(d);
        const planoRecebido = d.plano?.dados as PlanoDados | undefined;
        if (!planoRecebido) {
          setEditando(true);
          return;
        }
        setObjetivo(planoRecebido.objetivo ?? "");
        setMetaValor(
          planoRecebido.metaValor ? String(planoRecebido.metaValor) : "",
        );
        setModo(planoRecebido.modo ?? "sugestao");
        setValorManual(
          planoRecebido.modo === "manual"
            ? String(planoRecebido.valorMensal ?? "")
            : "",
        );
        setDataAlvo(planoRecebido.dataAlvo ?? "");
        setValorGuardado(String(Math.max(0, planoRecebido.valorGuardado ?? 0)));
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
          dataAlvo: dataAlvo || undefined,
          valorGuardado: valorGuardado ? Number(valorGuardado) : 0,
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

  // 1 retry silencioso; se falhar de novo, fallback útil + botão "Tentar de novo".
  async function chamarPergunta(texto: string, tentativa = 1): Promise<string> {
    try {
      const res = await fetch("/api/reserva/perguntar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta: texto }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      return data.resposta as string;
    } catch {
      if (tentativa === 1) return chamarPergunta(texto, 2);
      throw new Error("ASSISTENTE_INDISPONIVEL");
    }
  }

  async function perguntar() {
    if (!pergunta.trim() || perguntando) return;
    setPerguntando(true);
    setResposta(null);
    setErroPergunta(false);
    try {
      const r = await chamarPergunta(pergunta.trim());
      setResposta(r);
    } catch {
      setErroPergunta(true);
      setResposta(
        "O Gennys tá com dificuldade de responder agora. Isso costuma ser " +
          "passageiro — tenta de novo em instantes.",
      );
    } finally {
      setPerguntando(false);
    }
  }

  if (!dados) return <p className="text-sm text-muted">Carregando…</p>;

  const plano = dados.plano?.dados;
  const temRenda = dados.media.receitaMedia > 0;
  const temSugestao = dados.sugestaoValorMensal > 0;
  const temDespesa = dados.media.despesaMedia > 0;

  // Preview do valor mensal no modo "prazo" (meta ÷ meses até a data).
  const metaNum = metaValor ? Number(metaValor) : 0;
  const guardadoNum = Math.max(0, Number(valorGuardado) || 0);
  const mesesPrazo = dataAlvo ? mesesAteISO(dataAlvo) : null;
  const mensalPrazo =
    metaNum > 0 && mesesPrazo
      ? Math.ceil(Math.max(0, metaNum - guardadoNum) / mesesPrazo / 10) * 10
      : 0;

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
            <p className="mt-1 truncate text-sm text-soft">{plano.objetivo}</p>

            {/* Progresso usa somente o valor que o usuario confirmou como guardado. */}
            {plano.metaValor ? (
              (() => {
                const acumulado = Math.max(0, plano.valorGuardado ?? 0);
                const progresso = Math.min(1, acumulado / plano.metaValor);
                const falta = plano.metaValor - acumulado;
                const projecao =
                  falta > 0 && plano.valorMensal > 0
                    ? Math.ceil(falta / plano.valorMensal)
                    : 0;
                return (
                  <div className="mt-3">
                    <ProgressBar
                      valor={progresso}
                      cor={AMBER}
                      rotulo="Progresso da reserva"
                      textoValor={`${Math.round(progresso * 100)}% da meta guardada`}
                    />
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="font-mono text-soft">
                        {formatarReais(acumulado)} guardados de{" "}
                        {formatarReais(plano.metaValor)}
                      </span>
                      <span className="font-mono font-medium text-mod-financa">
                        {Math.round(progresso * 100)}%
                      </span>
                    </div>
                    {projecao > 0 && (
                      <p className="mt-1.5 text-xs text-muted">
                        Nesse ritmo ({formatarReais(plano.valorMensal)}/mês), você
                        chega em ~{projecao} {projecao === 1 ? "mês" : "meses"}.
                      </p>
                    )}
                    {falta <= 0 && (
                      <p className="mt-1.5 text-xs text-mod-financa">
                        🎉 Meta alcançada!
                      </p>
                    )}
                  </div>
                );
              })()
            ) : null}

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
            <Roteiro plano={plano} media={dados.media} />
            <div className="mt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="text-xs text-glow-blue hover:underline"
              >
                Ajustar
              </button>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <Eyebrow cor={AMBER}>Plano de reserva</Eyebrow>
          <p className="mt-1 text-sm text-soft">
            Média (últimos meses): receita{" "}
            <span className="font-mono tabular-nums">
              {formatarReais(dados.media.receitaMedia)}
            </span>{" "}
            · despesa{" "}
            <span className="font-mono tabular-nums">
              {formatarReais(dados.media.despesaMedia)}
            </span>
          </p>

          <div className="mt-3 flex flex-col gap-2.5">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-soft">Objetivo (reserva ou meta)</span>
                <input
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                placeholder="Ex.: reserva, viagem, moto"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-royal-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-soft">Quanto ja esta guardado (R$)</span>
              <input
                value={valorGuardado}
                onChange={(e) => setValorGuardado(e.target.value)}
                placeholder="Ex.: 500"
                inputMode="decimal"
                min="0"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-mono tabular-nums outline-none focus:border-royal-500"
              />
              <span className="text-xs text-muted">
                Informe apenas o que esta separado para esta meta; o saldo da conta nao e usado.
              </span>
            </label>

            {/* Como chegar lá: sugestão / por prazo / valor fixo */}
            <div className="flex flex-col gap-1">
              <span className="text-sm text-soft">Como chegar lá</span>
              <div className="grid grid-cols-3 gap-1.5 text-sm">
                <ModoBtn ativo={modo === "sugestao"} onClick={() => setModo("sugestao")}>
                  Sugestão
                </ModoBtn>
                <ModoBtn ativo={modo === "prazo"} onClick={() => setModo("prazo")}>
                  Por prazo
                </ModoBtn>
                <ModoBtn ativo={modo === "manual"} onClick={() => setModo("manual")}>
                  Valor fixo
                </ModoBtn>
              </div>
            </div>

            {/* Sugestão: fallback quando não há renda (nunca mostrar R$ 0,00) */}
            {modo === "sugestao" &&
              (temSugestao ? (
                <div className="rounded-lg border border-mod-financa/25 bg-mod-financa/10 px-3 py-2 text-sm">
                  Sugestão:{" "}
                  <span className="font-mono font-medium text-mod-financa">
                    {formatarReais(dados.sugestaoValorMensal)}/mês
                  </span>{" "}
                  <span className="text-muted">(20% do que sobra por mês)</span>
                </div>
              ) : !temRenda ? (
                <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm">
                  <p className="text-soft">
                    Registre sua renda pra eu calcular quanto dá pra guardar.
                  </p>
                  {onRegistrar && (
                    <button
                      type="button"
                      onClick={onRegistrar}
                      className="self-start rounded-lg bg-royal-500 px-3 py-1.5 text-xs font-medium text-white shadow-glowAccent transition hover:bg-royal-600"
                    >
                      + Registrar renda no chat
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-soft">
                  Seus gastos estão consumindo toda a renda. Reveja os gastos ou
                  defina um valor fixo pra começar aos poucos.
                </div>
              ))}

            {/* Por prazo: data-alvo + preview do mensal derivado */}
            {modo === "prazo" && (
              <div className="flex flex-col gap-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-soft">Até quando quer juntar?</span>
                  <input
                    type="month"
                    value={dataAlvo}
                    min={proximoMesISO()}
                    onChange={(e) => setDataAlvo(e.target.value)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-royal-500 [color-scheme:dark]"
                  />
                </label>
                {mensalPrazo > 0 && (
                  <p className="text-xs text-muted">
                    Pra juntar {formatarReais(metaNum)} em {mesesPrazo} meses,
                    guarde{" "}
                    <span className="font-mono font-medium text-mod-financa">
                      {formatarReais(mensalPrazo)}/mês
                    </span>
                    .
                  </p>
                )}
                {metaNum <= 0 && (
                  <p className="text-xs text-muted">
                    Preencha a meta em R$ abaixo pra eu calcular o valor mensal.
                  </p>
                )}
              </div>
            )}

            {/* Valor fixo */}
            {modo === "manual" && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-soft">Quanto guardar por mes (R$)</span>
                <input
                  value={valorManual}
                  onChange={(e) => setValorManual(e.target.value)}
                  placeholder="Ex.: 300"
                  inputMode="decimal"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-mono tabular-nums outline-none focus:border-royal-500"
                />
              </label>
            )}

            {/* Meta em R$ com racional explícito */}
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-soft">Meta em R$ (opcional)</span>
              <input
                value={metaValor}
                onChange={(e) => setMetaValor(e.target.value)}
                placeholder="Ex.: 5000"
                inputMode="decimal"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-mono tabular-nums outline-none focus:border-royal-500"
              />
              {temDespesa && (
                <button
                  type="button"
                  onClick={() =>
                    setMetaValor(String(dados.sugestaoMetaEmergencia))
                  }
                  className="self-start text-left text-xs text-muted hover:text-soft"
                >
                  Reserva de emergência = {dados.mesesReservaEmergencia} meses das
                  suas despesas ({formatarReais(dados.media.despesaMedia)}/mês) ={" "}
                  <span className="text-glow-blue underline">
                    {formatarReais(dados.sugestaoMetaEmergencia)}
                  </span>
                </button>
              )}
            </label>

            {erro && (
              <p className="text-xs text-mod-financa" role="alert">
                {erro}
              </p>
            )}

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
        <p className="mt-1 text-sm text-soft" id="reserva-pergunta-ajuda">
          Ex.: &quot;onde invisto esse dinheiro?&quot;
        </p>
        <div className="mt-2 flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Pergunta sobre a reserva</span>
            <input
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && perguntar()}
              disabled={perguntando}
              aria-describedby="reserva-pergunta-ajuda"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-royal-500 disabled:opacity-60"
              placeholder="Sua pergunta…"
            />
          </label>
          <Botao onClick={perguntar} disabled={perguntando}>
            {perguntando ? "…" : "Perguntar"}
          </Botao>
        </div>

        {perguntando && (
          <>
            <span className="sr-only" role="status">
              Preparando resposta.
            </span>
            <div className="mt-2 space-y-1.5" aria-hidden>
              <div className="h-3 w-full animate-pulse rounded bg-white/10" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
            </div>
          </>
        )}

        {!perguntando && resposta && (
            <div className="mt-2 rounded-lg bg-white/5 p-2.5" role="status" aria-live="polite">
            <p className="text-sm text-foreground">{resposta}</p>
            {erroPergunta && (
              <button
                type="button"
                onClick={perguntar}
                className="mt-2 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-foreground transition hover:bg-white/5"
              >
                Tentar de novo
              </button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function ModoBtn({
  children,
  ativo,
  onClick,
}: {
  children: React.ReactNode;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`rounded-lg border px-2 py-2 text-center text-xs font-medium transition ${
        ativo
          ? "border-mod-financa bg-mod-financa/15 text-foreground"
          : "border-white/10 bg-white/5 text-muted hover:text-soft"
      }`}
    >
      {children}
    </button>
  );
}

function Roteiro({
  plano,
  media,
}: {
  plano: PlanoDados;
  media: { despesaMedia: number };
}) {
  const passos: {
    titulo: string;
    detalhe: string | null;
    estado: "concluido" | "andamento" | "pendente";
  }[] = [
    { titulo: "Objetivo definido", detalhe: plano.objetivo, estado: "concluido" },
    {
      titulo: `Guardar ${formatarReais(plano.valorMensal)}/mês`,
      detalhe:
        plano.modo === "sugestao"
          ? "sugestão do Gennys"
          : plano.modo === "prazo"
            ? "pra bater a meta no prazo"
            : "definido por você",
      estado: "andamento",
    },
  ];
  if (plano.metaValor) {
    // Racional da meta quando bate com a reserva de emergência (6x despesa).
    const ehEmergencia =
      media.despesaMedia > 0 &&
      Math.abs(plano.metaValor - media.despesaMedia * 6) <=
        media.despesaMedia * 0.5;
    passos.push({
      titulo: `Alcançar ${formatarReais(plano.metaValor)}`,
      detalhe: ehEmergencia
        ? "≈ 6 meses das suas despesas"
        : plano.prazoMeses
          ? `~${plano.prazoMeses} meses`
          : null,
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
