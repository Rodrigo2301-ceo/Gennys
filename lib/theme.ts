// Fonte central da paleta do Gennys para uso em JS/inline `style`.
// Espelha os tokens de `app/globals.css` (:root) e `tailwind.config.ts` —
// MANTER EM SINCRONIA. Classes Tailwind (bg-royal-500, text-glow-blue, etc.)
// continuam usando os mesmos valores; este módulo é para quando a cor precisa
// entrar num style inline (glow dinâmico, canvas, gradientes por variável).

export const cores = {
  // Fundos azul royal
  bg900: "#0a1128",
  bg800: "#001845",
  bg700: "#0f1e3d",

  // Acentos
  accent: "#2563eb",
  accentStrong: "#1e40af",

  // Brilhos
  glowCyan: "#67e8f9",
  glowBlue: "#93c5fd",

  // Texto
  foreground: "#e8eefc",
  soft: "#c0c3d4", // apoio — mais contraste que muted (AA)
  muted: "#8ea3cc",

  // Superfícies / bordas translúcidas
  borda: "rgba(255,255,255,0.10)",
  bordaSutil: "rgba(255,255,255,0.06)",
  superficie: "rgba(255,255,255,0.05)",

  // Cores por módulo (CLAUDE.md)
  financa: "#f59e0b", // âmbar
  produtividade: "#14b8a6", // verde-azulado
  estudo: "#22d3ee", // ciano
  biblia: "#93c5fd", // azul-claro

  // Cores de dado (fluxo de caixa)
  dataIn: "#a5b4fc", // lavanda — "ganhei"
  dataOut: "#fb7185", // coral — "gastei"
} as const;

export type CorToken = keyof typeof cores;
