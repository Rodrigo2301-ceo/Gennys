// Ícones SVG inline (stroke). Presentacionais, herdam currentColor.

interface P {
  size?: number;
  className?: string;
}

function base(size = 18, className = "") {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
}

export function Calendario({ size, className }: P) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </svg>
  );
}

export function Chama({ size, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 3s5 3.5 5 8a5 5 0 0 1-10 0c0-1.5.7-2.7 1.5-3.5C8.5 9 9 10 9 10s-.3-4 3-7Z" />
    </svg>
  );
}

export function Check({ size, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function Circulo({ size, className }: P) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

export function Carteira({ size, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v.5" />
      <rect x="3" y="7.5" width="18" height="12" rx="2.5" />
      <path d="M16 13h2.5" />
    </svg>
  );
}

export function Alvo({ size, className }: P) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function Livro({ size, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />
    </svg>
  );
}

export function Cerebro({ size, className }: P) {
  return (
    <svg {...base(size, className)}>
      <circle cx="7" cy="8" r="2" />
      <circle cx="17" cy="7" r="2" />
      <circle cx="15" cy="17" r="2" />
      <path d="M8.7 9.2 13.4 15M9 8.2l6-.9" />
    </svg>
  );
}

export function Chat({ size, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4 3.5V16H5.5A1.5 1.5 0 0 1 4 14.5Z" />
    </svg>
  );
}

export function Halteres({ size, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M6.5 8v8M4 9.5v5M17.5 8v8M20 9.5v5M6.5 12h11" />
    </svg>
  );
}

export function Tarefa({ size, className }: P) {
  return (
    <svg {...base(size, className)}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  );
}

export function Repeticao({ size, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 8a5 5 0 0 1 5-5h6l-2-2m2 2-2 2" />
      <path d="M20 16a5 5 0 0 1-5 5H9l2 2m-2-2 2-2" />
    </svg>
  );
}

export function Relogio({ size, className }: P) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

export function Tendencia({ size, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 16l5-5 3.5 3.5L20 7" />
      <path d="M15 7h5v5" />
    </svg>
  );
}

export function Grafico({ size, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 4v16h16" />
      <path d="M7 14l3.5-4 3 2.5L20 7" />
    </svg>
  );
}

export function Aspas({ size, className }: P) {
  return (
    <svg width={size ?? 18} height={size ?? 18} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M7.5 6C5 6 3 8 3 10.6c0 2.3 1.7 4 3.9 4 .3 0 .6 0 .8-.1-.5 1.4-1.8 2.4-3.3 2.6-.3 0-.5.3-.5.6 0 .4.3.7.7.6 3-.5 5.2-3 5.2-6.3V10C9.8 7.7 8.8 6 7.5 6Zm9 0C14 6 12 8 12 10.6c0 2.3 1.7 4 3.9 4 .3 0 .6 0 .8-.1-.5 1.4-1.8 2.4-3.3 2.6-.3 0-.5.3-.5.6 0 .4.3.7.7.6 3-.5 5.2-3 5.2-6.3V10C18.8 7.7 17.8 6 16.5 6Z" />
    </svg>
  );
}

export function Chevron({ size, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function Salvar({ size, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M8 3v5h7M8 20v-6h8v6" />
    </svg>
  );
}

export function Gota({ size, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3Z" />
    </svg>
  );
}

export function Raio({ size, className }: P) {
  return (
    <svg {...base(size, className)}>
      <path d="M13 3 5 13h6l-2 8 8-10h-6l2-8Z" />
    </svg>
  );
}
