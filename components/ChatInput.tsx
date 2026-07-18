"use client";

import { useEffect, useRef, useState } from "react";

export interface ImagemSelecionada {
  base64: string;
  mediaType: string;
  previewUrl: string;
}

const MIME_OK = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB — mesmo limite do servidor

// Tipagem mínima da Web Speech API (não faz parte do lib.dom padrão).
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

export default function ChatInput({
  onEnviar,
  onTypingChange,
  onImagemSelecionada,
  enviando,
}: {
  onEnviar: (texto: string, imagem?: ImagemSelecionada) => void;
  onTypingChange: (digitando: boolean) => void;
  onImagemSelecionada: () => void;
  enviando: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [imagem, setImagem] = useState<ImagemSelecionada | null>(null);
  const [ouvindo, setOuvindo] = useState(false);
  const [suportaVoz, setSuportaVoz] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const w = window as unknown as {
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      SpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (Ctor) {
      setSuportaVoz(true);
      const rec = new Ctor();
      rec.lang = "pt-BR";
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (e: unknown) => {
        const ev = e as {
          results: ArrayLike<ArrayLike<{ transcript: string }>>;
        };
        const fala = Array.from({ length: ev.results.length })
          .map((_, i) => ev.results[i][0].transcript)
          .join(" ");
        setTexto((t) => (t ? `${t} ${fala}` : fala).trim());
      };
      rec.onend = () => setOuvindo(false);
      rec.onerror = () => setOuvindo(false);
      recRef.current = rec;
    }
  }, []);

  useEffect(() => {
    onTypingChange(texto.trim().length > 0);
  }, [texto, onTypingChange]);

  function alternarVoz() {
    const rec = recRef.current;
    if (!rec) return;
    if (ouvindo) {
      rec.stop();
      setOuvindo(false);
    } else {
      try {
        rec.start();
        setOuvindo(true);
      } catch {
        setOuvindo(false);
      }
    }
  }

  async function escolherImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!MIME_OK.includes(file.type)) {
      alert("Formato de imagem não suportado. Use JPG, PNG, GIF ou WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      alert("Imagem muito grande. O limite é 5MB.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    const base64 = dataUrl.split(",")[1] ?? "";
    setImagem({ base64, mediaType: file.type, previewUrl: dataUrl });
    onImagemSelecionada();
  }

  function enviar() {
    const t = texto.trim();
    if (!t && !imagem) return;
    if (enviando) return;
    onEnviar(t, imagem ?? undefined);
    setTexto("");
    setImagem(null);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  return (
    <div className="w-full">
      {imagem && (
        <div className="mb-2 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagem.previewUrl}
            alt="Prévia da imagem anexada"
            className="h-12 w-12 rounded-lg object-cover ring-1 ring-white/15"
          />
          <span className="text-xs text-muted">Imagem anexada</span>
          <button
            type="button"
            onClick={() => setImagem(null)}
            className="text-xs text-mod-financa hover:underline"
          >
            remover
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-2 py-2 backdrop-blur">
        <IconeBotao
          titulo="Anexar imagem"
          onClick={() => fileRef.current?.click()}
          disabled={enviando}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 15l-5-5L5 21" />
            <path d="M3 16V5a2 2 0 0 1 2-2h11" />
            <circle cx="8.5" cy="8.5" r="1.5" />
          </svg>
        </IconeBotao>

        {suportaVoz && (
          <IconeBotao
            titulo={ouvindo ? "Parar de ouvir" : "Falar"}
            onClick={alternarVoz}
            disabled={enviando}
            ativo={ouvindo}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </IconeBotao>
        )}

        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Fala comigo…"
          disabled={enviando}
          className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-foreground placeholder:text-muted/70 outline-none"
        />

        <button
          type="button"
          onClick={enviar}
          disabled={enviando || (!texto.trim() && !imagem)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-royal-500 text-white shadow-glowAccent transition hover:bg-royal-600 disabled:opacity-40 disabled:shadow-none"
          aria-label="Enviar"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={escolherImagem}
        />
      </div>
    </div>
  );
}

function IconeBotao({
  children,
  titulo,
  onClick,
  disabled,
  ativo,
}: {
  children: React.ReactNode;
  titulo: string;
  onClick: () => void;
  disabled?: boolean;
  ativo?: boolean;
}) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition disabled:opacity-40 ${
        ativo
          ? "bg-mod-financa/20 text-mod-financa"
          : "text-muted hover:bg-white/10 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
