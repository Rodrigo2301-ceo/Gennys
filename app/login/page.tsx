"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const res = await signIn("credentials", {
      email,
      senha,
      redirect: false,
    });

    setCarregando(false);

    if (res?.error) {
      setErro("E-mail ou senha incorretos.");
      return;
    }
    router.push("/painel");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-glow-cyan">
            Gennys
          </h1>
          <p className="mt-2 text-sm text-muted">Bom te ver de novo.</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Campo
            label="E-mail"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          <Campo
            label="Senha"
            type="password"
            value={senha}
            onChange={setSenha}
            autoComplete="current-password"
            required
          />

          {erro && (
            <p className="text-sm text-mod-financa" role="alert">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="mt-2 rounded-xl bg-royal-500 py-3 font-medium text-white transition hover:bg-royal-600 disabled:opacity-60"
          >
            {carregando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="text-glow-blue hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}

function Campo({
  label,
  type,
  value,
  onChange,
  autoComplete,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-foreground outline-none transition focus:border-royal-500"
      />
    </label>
  );
}
