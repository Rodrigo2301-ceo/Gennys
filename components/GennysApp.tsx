"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { signOut } from "next-auth/react";
import ChatInput, { type ImagemSelecionada } from "@/components/ChatInput";
import PainelLateral from "@/components/painel/PainelLateral";
import SeletorModelo from "@/components/SeletorModelo";
import type {
  AiProvider,
  AiProviderPublico,
} from "@/lib/ai/providers";

// Carrega o átomo só no cliente (three/postprocessing usam window/document).
const Atom3D = dynamic(() => import("@/components/atom/Atom3D"), {
  ssr: false,
  loading: () => <div className="absolute inset-0" />,
});
import {
  type AtomEstado,
  DURACAO_TRANSITORIA,
  COR_NUCLEO,
} from "@/components/atom/atomConfig";
import type { PropostaEntrada, TurnoHistorico } from "@/lib/engine/types";

interface Mensagem {
  id: number;
  autor: "usuario" | "gennys";
  texto: string;
  hora: string;
}

interface EnvioPendente {
  texto: string;
  imagem?: ImagemSelecionada;
}

interface ConfirmacaoPendente {
  proposta: PropostaEntrada;
  token: string;
}

let idSeq = 1;

function horaAgora(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function mensagemDeErro(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const obj = data as Record<string, unknown>;
  if (typeof obj.mensagem === "string") return obj.mensagem;
  if (typeof obj.error === "string") return obj.error;
  if (obj.error && typeof obj.error === "object") {
    const message = (obj.error as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

export default function GennysApp({
  nome,
  aiProvider,
  provedoresDisponiveis,
  consentimentoInicial,
  consentimentoVersao,
}: {
  nome: string;
  aiProvider: AiProvider;
  provedoresDisponiveis: AiProviderPublico[];
  consentimentoInicial: boolean;
  consentimentoVersao: string;
}) {
  const [estado, setEstado] = useState<AtomEstado>("idle");
  const [corModulo, setCorModulo] = useState<string>(COR_NUCLEO);
  const [feed, setFeed] = useState<Mensagem[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [painelAberto, setPainelAberto] = useState(false);
  const [provedorAtual, setProvedorAtual] = useState(aiProvider);
  const [consentido, setConsentido] = useState(consentimentoInicial);
  const [pedindoConsentimento, setPedindoConsentimento] = useState(false);
  const [envioPendente, setEnvioPendente] = useState<EnvioPendente | null>(null);
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoPendente | null>(null);
  const historicoRef = useRef<TurnoHistorico[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const consentimentoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feed]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!pedindoConsentimento) return;
    const modal = consentimentoRef.current;
    const seletor =
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focaveis = () => Array.from(modal?.querySelectorAll<HTMLElement>(seletor) ?? []);
    focaveis()[0]?.focus();

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setPedindoConsentimento(false);
        setEnvioPendente(null);
        return;
      }
      if (evento.key !== "Tab") return;
      const itens = focaveis();
      if (itens.length === 0) return;
      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [pedindoConsentimento]);

  const pulso = useCallback((tipo: "success" | "error" | "photo", cor?: string) => {
    if (cor) setCorModulo(cor);
    setEstado(tipo);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(
      () => setEstado("idle"),
      DURACAO_TRANSITORIA[tipo],
    );
  }, []);

  const setTyping = useCallback((digitando: boolean) => {
    setEstado((prev) => {
      if (prev === "idle" && digitando) return "typing";
      if (prev === "typing" && !digitando) return "idle";
      return prev;
    });
  }, []);

  function addMensagem(autor: "usuario" | "gennys", texto: string) {
    setFeed((f) =>
      [...f, { id: idSeq++, autor, texto, hora: horaAgora() }].slice(-8),
    );
  }

  async function enviarProcessamento(
    texto: string,
    imagem?: ImagemSelecionada,
  ) {
    const textoUsuario = texto || (imagem ? "🧾 (enviou uma imagem)" : "");
    addMensagem("usuario", textoUsuario);

    setEnviando(true);
    setEstado("processing");

    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto: texto || undefined,
          imagem: imagem
            ? { base64: imagem.base64, mediaType: imagem.mediaType }
            : undefined,
          historico: historicoRef.current,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        addMensagem(
          "gennys",
          mensagemDeErro(data, "Não consegui processar agora. Tente de novo."),
        );
        pulso("error");
        return;
      }

      if (data.status === "confirmacao") {
        addMensagem(
          "gennys",
          `${data.resposta} Confira os dados abaixo antes de salvar.`,
        );
        setConfirmacao({ proposta: data.proposta, token: data.token });
        historicoRef.current = [];
      } else if (data.status === "pergunta") {
        const combinado = [data.resposta, data.pergunta]
          .filter(Boolean)
          .join(" ")
          .trim();
        addMensagem("gennys", combinado);
        const novoHistorico: TurnoHistorico[] = [
          ...historicoRef.current,
          { autor: "usuario", texto: texto || "(imagem de nota/cupom)" },
          { autor: "gennys", texto: combinado },
        ];
        historicoRef.current = novoHistorico.slice(-8);
        pulso("error"); // dúvida: tremor + glow laranja
      }
    } catch {
      addMensagem("gennys", "Falha de conexão. Tenta de novo?");
      pulso("error");
    } finally {
      setEnviando(false);
    }
  }

  async function onEnviar(texto: string, imagem?: ImagemSelecionada) {
    if (enviando || confirmacao) return;
    if (provedoresDisponiveis.length === 0) {
      addMensagem(
        "gennys",
        "A IA está indisponível agora. Seus dados não foram enviados nem salvos.",
      );
      pulso("error");
      return;
    }
    if (!consentido) {
      setEnvioPendente({ texto, imagem });
      setPedindoConsentimento(true);
      return;
    }
    await enviarProcessamento(texto, imagem);
  }

  async function alterarProvedor(provider: AiProvider) {
    setProvedorAtual(provider);
    setConsentido(false);
    setConfirmacao(null);
    try {
      const res = await fetch(
        `/api/consentimento-ia?provider=${encodeURIComponent(provider)}`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));
      setConsentido(res.ok && Boolean(data.vigente));
    } catch {
      setConsentido(false);
    }
  }

  async function concederConsentimento() {
    if (!envioPendente || enviando) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/consentimento-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: provedorAtual,
          accepted: true,
          version: consentimentoVersao,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        addMensagem(
          "gennys",
          mensagemDeErro(data, "Não foi possível registrar o consentimento."),
        );
        pulso("error");
        return;
      }
      const pendente = envioPendente;
      setConsentido(true);
      setPedindoConsentimento(false);
      setEnvioPendente(null);
      setEnviando(false);
      await enviarProcessamento(pendente.texto, pendente.imagem);
    } catch {
      addMensagem("gennys", "Falha de conexão. Seus dados não foram enviados.");
      pulso("error");
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarProposta() {
    if (!confirmacao || enviando) return;
    setEnviando(true);
    try {
      const res = await fetch("/api/process/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(confirmacao),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.status !== "salvo") {
        addMensagem(
          "gennys",
          mensagemDeErro(data, "A confirmação expirou. Envie a mensagem novamente."),
        );
        pulso("error");
        return;
      }
      addMensagem("gennys", data.resposta ?? "Registro salvo com sua confirmação.");
      setConfirmacao(null);
      pulso("success", data.moduloCor);
    } catch {
      addMensagem("gennys", "Falha de conexão. O registro não foi confirmado.");
      pulso("error");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main
      className="relative flex min-h-dvh flex-col overflow-hidden"
      style={{
        // Vazio premium: gradiente radial azul-marinho, glow central atrás do
        // átomo, bordas quase preto-azuladas. Escopo: só a home (inline).
        background:
          "radial-gradient(680px 560px at 50% 36%, rgba(38,82,168,0.6) 0%, rgba(22,48,110,0.38) 45%, transparent 76%), radial-gradient(130% 110% at 50% 40%, #0c1733 0%, #060d20 100%)",
      }}
    >
      <header className="relative z-10 flex items-center justify-between px-5 py-4">
        <button
          onClick={() => setPainelAberto(true)}
          aria-label="Abrir menu"
          className="grid h-9 w-9 place-items-center rounded-lg text-white/90 transition duration-200 hover:bg-white/10 hover:text-white"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <SeletorModelo
          provedorInicial={aiProvider}
          provedores={provedoresDisponiveis}
          onProvedorAlterado={alterarProvedor}
        />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-muted transition duration-200 hover:text-foreground"
        >
          Sair
        </button>
      </header>

      <PainelLateral
        aberto={painelAberto}
        onFechar={() => setPainelAberto(false)}
      />

      <section className="relative min-h-0 flex-1">
        <Atom3D estado={estado} corModulo={corModulo} />
        {feed.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-10 px-6 text-center">
            <p className="font-sans text-[28px] font-medium leading-snug text-white sm:text-[32px]">
              Oi, {nome.split(" ")[0]}.
              <br />
              Me conta o que rolou.
            </p>
          </div>
        )}
      </section>

      <section className="relative z-10 mx-auto w-full max-w-xl px-4 pb-6">
        {feed.length > 0 && (
          <div className="no-scrollbar mb-3 max-h-56 space-y-3 overflow-y-auto">
            <div className="flex justify-center">
              <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
                Hoje
              </span>
            </div>
            {feed.map((m) => {
              const meu = m.autor === "usuario";
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${meu ? "items-end" : "items-start"}`}
                >
                  <span
                    className={`inline-block max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                      meu ? "bg-royal-500 text-white" : "bg-white/5 text-foreground"
                    }`}
                    style={
                      meu ? undefined : { boxShadow: "inset 2px 0 0 #2563eb" }
                    }
                  >
                    {m.texto}
                  </span>
                  <span className="mt-1 px-1 text-[10px] tabular-nums text-muted">
                    {m.hora}
                  </span>
                </div>
              );
            })}
            <div ref={fimRef} />
          </div>
        )}

        {confirmacao && (
          <div
            className="mb-3 rounded-2xl border border-glow-blue/30 bg-royal-800/95 p-4 shadow-glow"
            role="region"
            aria-labelledby="titulo-confirmacao"
          >
            <p
              id="titulo-confirmacao"
              className="text-sm font-medium text-glow-cyan"
            >
              Confirmar antes de salvar
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <dt className="text-muted">Tipo</dt>
              <dd className="text-right text-foreground">{confirmacao.proposta.tipo}</dd>
              <dt className="text-muted">Categoria</dt>
              <dd className="text-right text-foreground">
                {confirmacao.proposta.categoria ?? "Sem categoria"}
              </dd>
              {confirmacao.proposta.valor !== null && (
                <>
                  <dt className="text-muted">Valor</dt>
                  <dd className="text-right text-foreground">
                    {confirmacao.proposta.valor.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </dd>
                </>
              )}
            </dl>
            <p className="mt-2 text-xs text-soft">
              Nada foi gravado ainda. Confirme somente se os dados estiverem corretos.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmacao(null);
                  addMensagem("gennys", "Certo — não salvei esse registro.");
                }}
                disabled={enviando}
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-soft hover:bg-white/5"
              >
                Não salvar
              </button>
              <button
                type="button"
                onClick={confirmarProposta}
                disabled={enviando}
                className="rounded-lg bg-royal-500 px-3 py-2 text-sm font-medium text-white hover:bg-royal-600 disabled:opacity-60"
              >
                {enviando ? "Salvando…" : "Confirmar e salvar"}
              </button>
            </div>
          </div>
        )}

        <ChatInput
          onEnviar={onEnviar}
          onTypingChange={setTyping}
          onImagemSelecionada={() => pulso("photo")}
          enviando={enviando || Boolean(confirmacao)}
        />
      </section>

      {pedindoConsentimento && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-royal-900/80 px-4 backdrop-blur-sm"
          role="presentation"
        >
          <div
            ref={consentimentoRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-consentimento-ia"
            aria-describedby="descricao-consentimento-ia"
            className="w-full max-w-md rounded-2xl border border-glow-blue/30 bg-royal-800 p-5 shadow-glow"
          >
            <h2
              id="titulo-consentimento-ia"
              className="font-display text-lg font-bold text-glow-cyan"
            >
              Antes de usar a IA
            </h2>
            <p id="descricao-consentimento-ia" className="mt-2 text-sm text-soft">
              Para entender e organizar sua mensagem, o texto, até oito mensagens
              recentes e uma imagem anexada serão enviados ao provedor selecionado
              ({provedoresDisponiveis.find((p) => p.valor === provedorAtual)?.label}).
              Isso pode incluir dados pessoais, financeiros ou religiosos. O envio
              serve apenas para gerar a proposta exibida para sua confirmação.
            </p>
            <p className="mt-2 text-xs text-muted">
              Você pode revogar este consentimento a qualquer momento em Perfil.
              Sem consentimento, os recursos locais e seus dados já salvos continuam
              disponíveis.
            </p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setPedindoConsentimento(false);
                  setEnvioPendente(null);
                }}
                disabled={enviando}
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-soft hover:bg-white/5"
              >
                Agora não
              </button>
              <button
                type="button"
                onClick={concederConsentimento}
                disabled={enviando}
                className="rounded-lg bg-royal-500 px-3 py-2 text-sm font-medium text-white hover:bg-royal-600 disabled:opacity-60"
              >
                {enviando ? "Registrando…" : "Concordo e quero enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
