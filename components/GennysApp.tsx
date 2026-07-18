"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { signOut } from "next-auth/react";
import ChatInput, { type ImagemSelecionada } from "@/components/ChatInput";
import PainelLateral from "@/components/painel/PainelLateral";

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
import type { TurnoHistorico } from "@/lib/engine/types";

interface Mensagem {
  id: number;
  autor: "usuario" | "gennys";
  texto: string;
  hora: string;
}

let idSeq = 1;

function horaAgora(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

export default function GennysApp({ nome }: { nome: string }) {
  const [estado, setEstado] = useState<AtomEstado>("idle");
  const [corModulo, setCorModulo] = useState<string>(COR_NUCLEO);
  const [feed, setFeed] = useState<Mensagem[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [painelAberto, setPainelAberto] = useState(false);
  const historicoRef = useRef<TurnoHistorico[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feed]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

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

  async function onEnviar(texto: string, imagem?: ImagemSelecionada) {
    if (enviando) return;

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

      const data = await res.json();

      if (data.status === "salvo") {
        addMensagem("gennys", data.resposta);
        historicoRef.current = [];
        pulso("success", data.moduloCor);
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
      } else {
        addMensagem("gennys", data.mensagem ?? "Não consegui processar agora.");
        historicoRef.current = [];
        pulso("error");
      }
    } catch {
      addMensagem("gennys", "Falha de conexão. Tenta de novo?");
      pulso("error");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      <header className="relative z-10 flex items-center justify-between px-5 py-4">
        <button
          onClick={() => setPainelAberto(true)}
          aria-label="Abrir menu"
          className="grid h-9 w-9 place-items-center rounded-lg text-foreground transition hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-display text-lg font-bold tracking-tight text-glow-cyan">
          Gennys
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-muted transition hover:text-foreground"
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
          <div className="pointer-events-none absolute inset-x-0 bottom-6 text-center">
            <p className="text-sm text-muted">
              Oi, {nome.split(" ")[0]}. Me conta o que rolou.
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

        <ChatInput
          onEnviar={onEnviar}
          onTypingChange={setTyping}
          onImagemSelecionada={() => pulso("photo")}
          enviando={enviando}
        />
      </section>
    </main>
  );
}
