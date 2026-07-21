import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        royal: {
          900: "#0a1128",
          800: "#001845",
          700: "#0f1e3d",
          600: "#1e40af",
          500: "#2563eb",
        },
        glow: {
          cyan: "#67e8f9",
          blue: "#93c5fd",
        },
        mod: {
          financa: "#f59e0b",
          produtividade: "#14b8a6",
          estudo: "#22d3ee",
          biblia: "#93c5fd",
        },
        data: {
          in: "#a5b4fc", // lavanda — "ganhei"
          out: "#fb7185", // coral — "gastei"
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "var(--font-geist-sans)", "sans-serif"],
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(103, 232, 249, 0.35)",
        glowAccent: "0 0 24px -6px rgba(37, 99, 235, 0.55)",
        // Glow da pill de navegação ativa (azul-claro, glassmorphism premium).
        glowPill: "0 0 16px -3px rgba(147, 197, 253, 0.5)",
      },
    },
  },
  plugins: [],
};
export default config;
