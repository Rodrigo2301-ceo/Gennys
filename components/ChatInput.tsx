"use client";

import { useEffect, useId, useRef, useState } from "react";

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
  onerror: ((evento: { error?: string }) => void) | null;
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
  const [erroVoz, setErroVoz] = useState<string | null>(null);
  const [suportaVoz, setSuportaVoz] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const campoId = useId();
  const statusVozId = useId();

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
        setErroVoz(null);
      };
      rec.onend = () => setOuvindo(false);
      rec.onerror = (evento) => {
        setOuvindo(false);
        setErroVoz(
          evento.error === "not-allowed" || evento.error === "service-not-allowed"
            ? "Permita o uso do microfone para ditar sua mensagem."
            : "Nao foi possivel ouvir agora. Tente novamente.",
        );
      };
      recRef.current = rec;
      return () => {
        rec.onresult = null;
        rec.onend = null;
        rec.onerror = null;
        try {
          rec.stop();
        } catch {
          // O navegador pode rejeitar stop() quando o reconhecimento ja terminou.
        }
        recRef.current = null;
      };
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
        setErroVoz(null);
        rec.start();
        setOuvindo(true);
      } catch {
        setOuvindo(false);
        setErroVoz("Nao foi possivel iniciar o microfone.");
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

      <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 py-2.5 pl-3 pr-2.5 backdrop-blur-xl">
        <IconeBotao
          titulo="Anexar imagem"
          onClick={() => fileRef.current?.click()}
          disabled={enviando}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8.8A2.3 2.3 0 0 1 6.3 6.5h1.2l1.2-1.9a1.5 1.5 0 0 1 1.27-.7h4.06a1.5 1.5 0 0 1 1.27.7l1.2 1.9h1.2A2.3 2.3 0 0 1 20 8.8v7.9a2.3 2.3 0 0 1-2.3 2.3H6.3A2.3 2.3 0 0 1 4 16.7Z" />
            <circle cx="12" cy="12.6" r="3.1" />
          </svg>
        </IconeBotao>

        {suportaVoz && (
          <IconeBotao
            titulo={ouvindo ? "Parar de ouvir" : "Falar"}
            onClick={alternarVoz}
            disabled={enviando}
            ativo={ouvindo}
            pressed={ouvindo}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </IconeBotao>
        )}

        <label htmlFor={campoId} className="sr-only">
          Mensagem para o Gennys
        </label>
        <input
          id={campoId}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Fala comigo…"
          disabled={enviando}
          aria-describedby={suportaVoz ? statusVozId : undefined}
          className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-white placeholder:text-white/50 outline-none"
        />

        <button
          type="button"
          onClick={enviar}
          disabled={enviando || (!texto.trim() && !imagem)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-royal-500 transition duration-200 hover:text-glow-blue active:scale-95 disabled:opacity-40"
          aria-label="Enviar"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M3.4 20.4 21 12 3.4 3.6l-.01 6.53L14.5 12 3.39 13.87z" />
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
      {suportaVoz && (
        <p
          id={statusVozId}
          className={erroVoz ? "mt-1.5 text-xs text-mod-financa" : "sr-only"}
          role={erroVoz ? "alert" : "status"}
          aria-live="polite"
        >
          {erroVoz ?? (ouvindo ? "Microfone ativo. Fale agora." : "Microfone parado.")}
        </p>
      )}
    </div>
  );
}

function IconeBotao({
  children,
  titulo,
  onClick,
  disabled,
  ativo,
  pressed,
}: {
  children: React.ReactNode;
  titulo: string;
  onClick: () => void;
  disabled?: boolean;
  ativo?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition duration-200 disabled:opacity-40 ${
        ativo
          ? "bg-mod-financa/20 text-mod-financa"
          : "text-white/80 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
