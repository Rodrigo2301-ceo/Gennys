"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, senha, dataNascimento }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErro(data.error ?? "Não foi possível criar a conta.");
      setCarregando(false);
      return;
    }

    // Já entra direto após cadastrar.
    const login = await signIn("credentials", {
      email,
      senha,
      redirect: false,
    });
    setCarregando(false);

    if (login?.error) {
      setErro("Conta criada, mas o login falhou. Tente entrar.");
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
          <p className="mt-2 text-sm text-muted">
            Vamos criar sua conta em segundos.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Campo
            label="Nome"
            type="text"
            value={nome}
            onChange={setNome}
            autoComplete="name"
            required
          />
          <Campo
            label="Data de nascimento"
            type="date"
            value={dataNascimento}
            onChange={setDataNascimento}
          />
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
            autoComplete="new-password"
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
            {carregando ? "Criando…" : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Já tem conta?{" "}
          <Link href="/login" className="text-glow-blue hover:underline">
            Entrar
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
        className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-foreground outline-none transition focus:border-royal-500 [color-scheme:dark]"
      />
    </label>
  );
}
