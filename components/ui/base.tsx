// Primitivos visuais do design system do Gennys. Puramente presentacionais
// (sem estado/lógica), reusados por todas as telas do painel.

import type { CSSProperties, ReactNode } from "react";

const ACCENT = "#2563eb";

// Eyebrow: mono, caixa alta, tracking largo, cor accent (royal por padrão).
export function Eyebrow({
  children,
  cor,
}: {
  children: ReactNode;
  cor?: string;
}) {
  return (
    <p className="eyebrow" style={cor ? { color: cor } : undefined}>
      {children}
    </p>
  );
}

// Título de tela: Space Grotesk bold, grande. Subtítulo opcional em mono.
export function TituloTela({
  children,
  sub,
}: {
  children: ReactNode;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
        {children}
      </h2>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

// Card: superfície um tom acima do fundo, borda sutil, raio 16-20, padding.
export function Card({
  children,
  className = "",
  accent,
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  accent?: string;
  glow?: boolean;
}) {
  const style: CSSProperties = {
    borderColor: accent ? `${accent}55` : "rgba(255,255,255,0.10)",
  };
  if (glow) style.boxShadow = `0 0 26px -8px ${accent ?? "rgba(37,99,235,0.65)"}`;
  return (
    <div className={`rounded-2xl border bg-white/5 p-4 ${className}`} style={style}>
      {children}
    </div>
  );
}

// Ícone-tile: quadrado arredondado com ícone dentro, à esquerda de rows.
export function IconeTile({
  children,
  cor = ACCENT,
  className = "",
}: {
  children: ReactNode;
  cor?: string;
  className?: string;
}) {
  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${className}`}
      style={{ backgroundColor: `${cor}1f`, color: cor }}
    >
      {children}
    </span>
  );
}

// Badge de status: pill pequeno.
export function Badge({
  children,
  cor = "#8ea3cc",
}: {
  children: ReactNode;
  cor?: string;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
      style={{ color: cor, backgroundColor: `${cor}22` }}
    >
      {children}
    </span>
  );
}

// Chip: pill com ícone opcional (ex.: chip de data).
export function Chip({
  children,
  icone,
  cor,
}: {
  children: ReactNode;
  icone?: ReactNode;
  cor?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs"
      style={cor ? { color: cor } : { color: "var(--muted)" }}
    >
      {icone}
      {children}
    </span>
  );
}

// Progress bar: trilho escuro + preenchimento com gradiente royal→accent.
export function ProgressBar({
  valor,
  cor = ACCENT,
  className = "",
}: {
  valor: number; // 0..1
  cor?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, valor)) * 100;
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-white/10 ${className}`}>
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, #1e40af, ${cor})`,
        }}
      />
    </div>
  );
}

// Número-herói: mono grande com glow sutil da própria cor.
export function HeroNumero({
  children,
  cor = ACCENT,
  className = "",
}: {
  children: ReactNode;
  cor?: string;
  className?: string;
}) {
  return (
    <span
      className={`font-mono text-4xl font-bold leading-none tracking-tight ${className}`}
      style={{ color: cor, textShadow: `0 0 22px ${cor}55` }}
    >
      {children}
    </span>
  );
}

// Botão: primário (sólido royal) ou secundário (ghost com borda + seta).
export function Botao({
  children,
  variante = "primario",
  onClick,
  seta = false,
  disabled = false,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  variante?: "primario" | "ghost";
  onClick?: () => void;
  seta?: boolean;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  if (variante === "primario") {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl bg-royal-500 px-4 py-2.5 text-sm font-medium text-white shadow-glowAccent transition hover:bg-royal-600 disabled:opacity-60 ${className}`}
      >
        {children}
        {seta && <span aria-hidden>→</span>}
      </button>
    );
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-4 py-2.5 text-sm text-foreground transition hover:border-white/30 hover:bg-white/5 disabled:opacity-60 ${className}`}
    >
      {children}
      {seta && <span aria-hidden>→</span>}
    </button>
  );
}

// Título de seção (mono, caixa alta, muted).
export function SecaoTitulo({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
      {children}
    </h3>
  );
}

// Cabeçalho de tela padrão: eyebrow + título + slot à direita (chip/stat).
export function CabecalhoTela({
  eyebrow,
  eyebrowCor,
  titulo,
  sub,
  direita,
}: {
  eyebrow: string;
  eyebrowCor?: string;
  titulo: string;
  sub?: string;
  direita?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <Eyebrow cor={eyebrowCor}>{eyebrow}</Eyebrow>
        <TituloTela sub={sub}>{titulo}</TituloTela>
      </div>
      {direita && <div className="shrink-0">{direita}</div>}
    </div>
  );
}
