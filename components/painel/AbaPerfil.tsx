"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import ExcluirConta from "./ExcluirConta";
import {
  Badge,
  CabecalhoTela,
  Card,
  Eyebrow,
  IconeTile,
  SecaoTitulo,
} from "@/components/ui/base";
import { Cadeado, Envelope, Pessoa, Sair } from "@/components/ui/icones";
import { PROVEDORES_IA, type AiProvider } from "@/lib/ai/providers";
import { cores } from "@/lib/theme";

const ROYAL = cores.accent;

interface Perfil {
  name: string;
  email: string;
  birthDate: string | null;
  plan: string;
  aiProvider: AiProvider;
  createdAt: string;
}

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(
    new Date(iso),
  );
}

export default function AbaPerfil() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  function carregar() {
    fetch("/api/perfil")
      .then((r) => r.json())
      .then((d) => setPerfil(d.perfil ?? null))
      .catch(() => setPerfil(null));
  }
  useEffect(() => {
    carregar();
  }, []);

  if (!perfil) return <p className="text-sm text-muted">Carregando…</p>;

  const inicial = perfil.name.trim().charAt(0).toUpperCase() || "?";
  const cerebro = PROVEDORES_IA.find((p) => p.valor === perfil.aiProvider);

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoTela eyebrow="Minha Conta" eyebrowCor={ROYAL} titulo="Perfil" />

      {/* Cartão de identidade */}
      <Card accent={ROYAL} glow>
        <div className="flex items-center gap-3">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-display text-2xl font-bold"
            style={{ backgroundColor: `${ROYAL}22`, color: cores.glowBlue }}
          >
            {inicial}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold text-foreground">
              {perfil.name}
            </p>
            <p className="truncate text-sm text-soft">{perfil.email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge cor={cores.financa}>Plano {perfil.plan}</Badge>
              <span className="text-xs text-muted">
                membro desde {formatarData(perfil.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Dados pessoais (sem senha) */}
      <DadosPessoais perfil={perfil} onSalvo={carregar} />

      {/* Cérebro atual (só informativo; troca fica no seletor da home) */}
      <Card className="flex items-center gap-3">
        <IconeTile cor={cores.glowCyan}>
          <Pessoa size={18} />
        </IconeTile>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground">Cérebro do Gennys</p>
          <p className="text-xs text-muted">
            IA atual: <span className="text-glow-cyan">{cerebro?.label}</span> ·
            troque no topo da tela inicial
          </p>
        </div>
      </Card>

      {/* Segurança: e-mail e senha (exigem senha atual) */}
      <TrocarEmail emailAtual={perfil.email} onSalvo={carregar} />
      <TrocarSenha />

      {/* Sessão */}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center justify-center gap-2 rounded-xl border border-white/15 py-2.5 text-sm text-soft transition hover:bg-white/5 hover:text-foreground"
      >
        <Sair size={16} /> Sair da conta
      </button>

      {/* Zona de perigo: exclusão de conta (LGPD) */}
      <div>
        <SecaoTitulo>Zona de perigo</SecaoTitulo>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-mod-financa/20 bg-mod-financa/5 p-4 text-center">
          <p className="text-xs text-muted">
            Excluir a conta apaga permanentemente todos os seus dados. Não dá pra
            desfazer.
          </p>
          <ExcluirConta />
        </div>
      </div>
    </div>
  );
}

// --- Sub-seções ---

function DadosPessoais({
  perfil,
  onSalvo,
}: {
  perfil: Perfil;
  onSalvo: () => void;
}) {
  const [nome, setNome] = useState(perfil.name);
  const [nasc, setNasc] = useState(perfil.birthDate?.slice(0, 10) ?? "");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(
    null,
  );

  const mudou =
    nome.trim() !== perfil.name ||
    (nasc || null) !== (perfil.birthDate?.slice(0, 10) ?? null);

  async function salvar() {
    setSalvando(true);
    setMsg(null);
    try {
      const res = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nome, birthDate: nasc || null }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Erro ao salvar.");
      setMsg({ tipo: "ok", texto: "Dados atualizados." });
      onSalvo();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e instanceof Error ? e.message : "Erro." });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card>
      <Eyebrow>Dados pessoais</Eyebrow>
      <div className="mt-2 flex flex-col gap-2.5">
        <Campo label="Nome" value={nome} onChange={setNome} />
        <Campo label="Data de nascimento" type="date" value={nasc} onChange={setNasc} />
        {msg && (
          <p
            className={`text-xs ${msg.tipo === "ok" ? "text-mod-produtividade" : "text-mod-financa"}`}
          >
            {msg.texto}
          </p>
        )}
        <button
          type="button"
          onClick={salvar}
          disabled={!mudou || salvando}
          className="self-start rounded-lg bg-royal-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-royal-600 disabled:opacity-40"
        >
          {salvando ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </Card>
  );
}

function TrocarEmail({
  emailAtual,
  onSalvo,
}: {
  emailAtual: string;
  onSalvo: () => void;
}) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(
    null,
  );

  async function salvar() {
    if (!email.trim() || !senha) {
      setMsg({ tipo: "erro", texto: "Preencha o novo e-mail e a senha atual." });
      return;
    }
    setSalvando(true);
    setMsg(null);
    try {
      const res = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senhaAtual: senha }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Erro ao trocar e-mail.");
      setMsg({ tipo: "ok", texto: "E-mail atualizado." });
      setEmail("");
      setSenha("");
      onSalvo();
    } catch (e) {
      setMsg({ tipo: "erro", texto: e instanceof Error ? e.message : "Erro." });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Envelope size={15} className="text-muted" />
        <Eyebrow>Alterar e-mail</Eyebrow>
      </div>
      <p className="mt-1 text-xs text-muted">Atual: {emailAtual}</p>
      <div className="mt-2 flex flex-col gap-2.5">
        <Campo label="Novo e-mail" type="email" value={email} onChange={setEmail} />
        <Campo label="Senha atual" type="password" value={senha} onChange={setSenha} />
        {msg && (
          <p
            className={`text-xs ${msg.tipo === "ok" ? "text-mod-produtividade" : "text-mod-financa"}`}
          >
            {msg.texto}
          </p>
        )}
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="self-start rounded-lg bg-royal-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-royal-600 disabled:opacity-40"
        >
          {salvando ? "Salvando…" : "Trocar e-mail"}
        </button>
      </div>
    </Card>
  );
}

function TrocarSenha() {
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(
    null,
  );

  async function salvar() {
    if (!nova || !senha) {
      setMsg({ tipo: "erro", texto: "Preencha a nova senha e a senha atual." });
      return;
    }
    if (nova !== confirma) {
      setMsg({ tipo: "erro", texto: "A confirmação não bate com a nova senha." });
      return;
    }
    setSalvando(true);
    setMsg(null);
    try {
      const res = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novaSenha: nova, senhaAtual: senha }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Erro ao trocar senha.");
      setMsg({ tipo: "ok", texto: "Senha atualizada." });
      setNova("");
      setConfirma("");
      setSenha("");
    } catch (e) {
      setMsg({ tipo: "erro", texto: e instanceof Error ? e.message : "Erro." });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Cadeado size={15} className="text-muted" />
        <Eyebrow>Alterar senha</Eyebrow>
      </div>
      <div className="mt-2 flex flex-col gap-2.5">
        <Campo label="Nova senha" type="password" value={nova} onChange={setNova} />
        <Campo
          label="Confirmar nova senha"
          type="password"
          value={confirma}
          onChange={setConfirma}
        />
        <Campo label="Senha atual" type="password" value={senha} onChange={setSenha} />
        {msg && (
          <p
            className={`text-xs ${msg.tipo === "ok" ? "text-mod-produtividade" : "text-mod-financa"}`}
          >
            {msg.texto}
          </p>
        )}
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="self-start rounded-lg bg-royal-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-royal-600 disabled:opacity-40"
        >
          {salvando ? "Salvando…" : "Trocar senha"}
        </button>
      </div>
    </Card>
  );
}

function Campo({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-soft">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={type === "password" ? "off" : undefined}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground outline-none focus:border-royal-500 [color-scheme:dark]"
      />
    </label>
  );
}
