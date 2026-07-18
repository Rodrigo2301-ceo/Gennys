"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { CLASSES_GRAFO, type ClasseGrafo } from "@/lib/cerebro/classes";

// react-force-graph usa canvas/window — só no cliente.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as unknown as React.ComponentType<Record<string, unknown>>;

interface NoGrafo {
  id: string;
  classe: ClasseGrafo;
  cor: string;
  label: string;
  origem: "entry" | "memory" | "marcacao";
  data: string;
  detalhe: Record<string, unknown>;
  x?: number;
  y?: number;
}

interface DadosGrafo {
  nodes: NoGrafo[];
  links: { source: string; target: string }[];
  total: number;
  mostrando: number;
  limite: number;
}

const PERIODOS: { id: string; rotulo: string }[] = [
  { id: "semana", rotulo: "7 dias" },
  { id: "mes", rotulo: "30 dias" },
  { id: "trimestre", rotulo: "90 dias" },
  { id: "tudo", rotulo: "Tudo" },
];

const ROTULO_TIPO: Record<string, string> = {
  financa: "Finança",
  tarefa: "Tarefa",
  habito: "Hábito",
  estudo: "Estudo",
  nota: "Nota",
};

const LINK_COR = "rgba(103, 232, 249, 0.16)"; // ciano translúcido

export default function GrafoCerebro() {
  const [periodo, setPeriodo] = useState("mes");
  const [dados, setDados] = useState<DadosGrafo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [selecionado, setSelecionado] = useState<NoGrafo | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [medidas, setMedidas] = useState({ largura: 0, altura: 420 });

  useEffect(() => {
    setCarregando(true);
    setSelecionado(null);
    fetch(`/api/cerebro/grafo?periodo=${periodo}`)
      .then((r) => r.json())
      .then((d) => setDados(d.error ? null : d))
      .finally(() => setCarregando(false));
  }, [periodo]);

  // Mede a largura disponível (o painel é estreito no mobile).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const medir = () => {
      const largura = el.clientWidth;
      const altura = Math.max(
        320,
        Math.min(460, Math.round(window.innerHeight * 0.55)),
      );
      setMedidas({ largura, altura });
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    window.addEventListener("resize", medir);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, []);

  const graphData = useMemo(
    () => ({ nodes: dados?.nodes ?? [], links: dados?.links ?? [] }),
    [dados],
  );

  const classesPresentes = useMemo(() => {
    const set = new Set<ClasseGrafo>();
    for (const n of dados?.nodes ?? []) set.add(n.classe);
    return set;
  }, [dados]);

  function pintarNo(
    node: NoGrafo,
    ctx: CanvasRenderingContext2D,
    globalScale: number,
  ) {
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    const raio = 4;
    const cor = node.cor;

    // Halo (glow sutil)
    const grad = ctx.createRadialGradient(x, y, 0, x, y, raio * 3);
    grad.addColorStop(0, `${cor}cc`);
    grad.addColorStop(0.4, `${cor}55`);
    grad.addColorStop(1, `${cor}00`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, raio * 3, 0, Math.PI * 2);
    ctx.fill();

    // Núcleo
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(x, y, raio, 0, Math.PI * 2);
    ctx.fill();

    // Realce do selecionado
    if (selecionado?.id === node.id) {
      ctx.strokeStyle = "#e8eefc";
      ctx.lineWidth = 1.5 / globalScale;
      ctx.beginPath();
      ctx.arc(x, y, raio + 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Rótulo só quando bem ampliado (evita poluir e pesar)
    if (globalScale > 2.4) {
      ctx.fillStyle = "rgba(232,238,252,0.85)";
      ctx.font = `${11 / globalScale}px sans-serif`;
      ctx.textBaseline = "middle";
      ctx.fillText(node.label, x + raio + 3, y);
    }
  }

  function areaClique(
    node: NoGrafo,
    cor: string,
    ctx: CanvasRenderingContext2D,
  ) {
    const x = node.x ?? 0;
    const y = node.y ?? 0;
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Filtro por período */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">
          {dados
            ? `${dados.mostrando} de ${dados.total} registros`
            : "Mapa da sua vida"}
          {dados && dados.total > dados.limite && (
            <span className="text-glow-blue"> · máx. {dados.limite}</span>
          )}
        </span>
        <div className="no-scrollbar flex gap-1 overflow-x-auto">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-xs transition ${
                periodo === p.id
                  ? "bg-royal-500/25 text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {(Object.keys(CLASSES_GRAFO) as ClasseGrafo[])
          .filter((c) => classesPresentes.has(c))
          .map((c) => (
            <span key={c} className="flex items-center gap-1.5 text-xs text-muted">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: CLASSES_GRAFO[c].cor,
                  boxShadow: `0 0 6px ${CLASSES_GRAFO[c].cor}`,
                }}
              />
              {CLASSES_GRAFO[c].rotulo}
            </span>
          ))}
      </div>

      {/* Grafo */}
      <div
        ref={wrapRef}
        className="relative overflow-hidden rounded-xl border border-white/10"
        style={{
          height: medidas.altura,
          background:
            "radial-gradient(120% 100% at 50% 0%, #0f1e3d 0%, #0a1128 70%)",
        }}
      >
        {carregando ? (
          <div className="grid h-full place-items-center text-sm text-muted">
            Montando o mapa…
          </div>
        ) : !dados || dados.nodes.length === 0 ? (
          <div className="grid h-full place-items-center px-6 text-center text-sm text-muted">
            Nada por aqui neste período. Registre coisas com o Gennys e elas
            aparecem como átomos conectados.
          </div>
        ) : (
          medidas.largura > 0 && (
            <ForceGraph2D
              graphData={graphData}
              width={medidas.largura}
              height={medidas.altura}
              backgroundColor="rgba(0,0,0,0)"
              nodeCanvasObject={pintarNo}
              nodePointerAreaPaint={areaClique}
              linkColor={() => LINK_COR}
              linkWidth={0.6}
              nodeRelSize={4}
              cooldownTicks={90}
              d3VelocityDecay={0.3}
              onNodeClick={(n: NoGrafo) => setSelecionado(n)}
              onBackgroundClick={() => setSelecionado(null)}
            />
          )
        )}

        {/* Card de detalhe do nó clicado */}
        {selecionado && (
          <div className="absolute inset-x-2 bottom-2 rounded-xl border border-white/10 bg-royal-800/95 p-3 backdrop-blur">
            <div className="mb-1 flex items-center justify-between">
              <span
                className="text-xs font-medium"
                style={{ color: selecionado.cor }}
              >
                {CLASSES_GRAFO[selecionado.classe].rotulo}
              </span>
              <button
                onClick={() => setSelecionado(null)}
                className="text-muted hover:text-foreground"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <DetalheNo no={selecionado} />
          </div>
        )}
      </div>
    </div>
  );
}

function DetalheNo({ no }: { no: NoGrafo }) {
  const d = no.detalhe;

  if (no.origem === "entry") {
    const valor = d.valor as number | null;
    const tipo = d.tipo as string;
    return (
      <div>
        <p className="text-sm text-foreground">{String(d.titulo ?? "")}</p>
        <p className="mt-0.5 text-xs text-muted">
          {ROTULO_TIPO[tipo] ?? tipo}
          {d.categoria ? ` · ${String(d.categoria)}` : ""}
          {valor !== null && valor !== undefined
            ? ` · ${valor.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}`
            : ""}
        </p>
      </div>
    );
  }

  if (no.origem === "memory") {
    return (
      <div>
        <p className="text-sm text-foreground">{String(d.fato ?? "")}</p>
        {d.categoria ? (
          <p className="mt-0.5 text-xs text-muted">{String(d.categoria)}</p>
        ) : null}
      </div>
    );
  }

  // marcacao
  return (
    <div>
      <p className="text-sm font-medium text-mod-biblia">{String(d.ref ?? "")}</p>
      <p
        className="mt-0.5 text-sm text-foreground/90"
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >
        {String(d.texto ?? "")}
      </p>
      {d.observacao ? (
        <p className="mt-1 rounded-lg bg-black/20 px-2 py-1 text-xs text-muted">
          {String(d.observacao)}
        </p>
      ) : null}
    </div>
  );
}
