"use client";

import { useEffect, useMemo, useState } from "react";
import EntryRow from "./EntryRow";
import ListaRegistros from "./ListaRegistros";
import { CORES_MODULO } from "@/lib/modules";
import { ehTreino, tituloEntry, type EntryLike } from "@/lib/entryDisplay";
import {
  Card,
  CabecalhoTela,
  Chip,
  EmptyState,
  Eyebrow,
  HeroNumero,
  ProgressBar,
} from "@/components/ui/base";
import { Calendario, Chama, Halteres, Repeticao } from "@/components/ui/icones";
import { cores } from "@/lib/theme";

const TEAL = CORES_MODULO.habito; // #14b8a6

function diaISO(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

function ultimosDias(n: number): string[] {
  const dias: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dias.push(diaISO(d));
  }
  return dias;
}

// Sequência de dias seguidos com algum hábito (derivada das datas já carregadas).
function calcularStreak(datas: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  if (!datas.has(diaISO(new Date()))) cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    if (!datas.has(diaISO(cursor))) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function FrequenciaSemanal({ entries }: { entries: EntryLike[] }) {
  const dias7 = useMemo(() => ultimosDias(7), []);
  const grupos = useMemo(() => {
    const mapa = new Map<string, Set<string>>();
    for (const e of entries) {
      const chave = (e.categoria || tituloEntry(e)).trim().toLowerCase();
      const dia = diaISO(new Date(e.createdAt));
      if (!mapa.has(chave)) mapa.set(chave, new Set());
      mapa.get(chave)!.add(dia);
    }
    return Array.from(mapa.entries()).map(([nome, diasSet]) => ({ nome, diasSet }));
  }, [entries]);

  if (grupos.length === 0) return null;

  return (
    <Card className="mb-3 flex flex-col gap-2">
      <Eyebrow cor={TEAL}>Frequência · 7 dias</Eyebrow>
      {grupos.map((g) => (
        <div key={g.nome} className="flex items-center justify-between gap-2">
          <span className="truncate text-sm capitalize text-foreground">{g.nome}</span>
          <div className="flex shrink-0 gap-1">
            {dias7.map((dia) => (
              <span
                key={dia}
                title={dia}
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: g.diasSet.has(dia) ? TEAL : cores.borda,
                  boxShadow: g.diasSet.has(dia) ? `0 0 8px -1px ${TEAL}` : undefined,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </Card>
  );
}

function SecaoTitulo({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
      {children}
    </h3>
  );
}

export default function AbaProdutividade() {
  const [habitos, setHabitos] = useState<EntryLike[] | null>(null);

  useEffect(() => {
    fetch("/api/entries?tipo=habito")
      .then((r) => r.json())
      .then((d) => setHabitos(d.entries ?? []))
      .catch(() => setHabitos([]));
  }, []);

  function atualizar(atualizado: EntryLike) {
    setHabitos((prev) =>
      (prev ?? []).map((p) => (p.id === atualizado.id ? atualizado : p)),
    );
  }
  function remover(id: string) {
    setHabitos((prev) => (prev ?? []).filter((p) => p.id !== id));
  }

  const treinos = habitos?.filter(ehTreino) ?? [];
  const habitosGerais = habitos?.filter((e) => !ehTreino(e)) ?? [];

  // Métricas derivadas (dado real já carregado): eficiência do dia + streak.
  const { eficiencia, streak } = useMemo(() => {
    const lista = habitos ?? [];
    const diaAtual = diaISO(new Date());
    const grupos = new Map<string, Set<string>>();
    const todasDatas = new Set<string>();
    for (const e of lista) {
      const chave = (e.categoria || tituloEntry(e)).trim().toLowerCase();
      const dia = diaISO(new Date(e.createdAt));
      if (!grupos.has(chave)) grupos.set(chave, new Set());
      grupos.get(chave)!.add(dia);
      todasDatas.add(dia);
    }
    const total = grupos.size;
    const ativosHoje = Array.from(grupos.values()).filter((s) =>
      s.has(diaAtual),
    ).length;
    return {
      eficiencia: total > 0 ? ativosHoje / total : 0,
      streak: calcularStreak(todasDatas),
    };
  }, [habitos]);

  const hoje = diaISO(new Date());
  const dataChip = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date());

  const temHabitos = (habitos?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-4">
      <CabecalhoTela
        eyebrow="Otimização Diária"
        eyebrowCor={TEAL}
        titulo="Hábitos"
        direita={<Chip icone={<Calendario size={13} />}>{dataChip}</Chip>}
      />

      {temHabitos && (
        <div className="flex flex-col gap-3">
          <Card accent={TEAL} glow>
            <Eyebrow cor={TEAL}>Eficiência do Ciclo</Eyebrow>
            <div className="mt-1.5 flex items-end gap-2">
              <HeroNumero cor={TEAL}>{Math.round(eficiencia * 100)}%</HeroNumero>
              <span className="mb-1 text-xs text-muted">
                dos hábitos ativos hoje
              </span>
            </div>
            <ProgressBar valor={eficiencia} cor={TEAL} className="mt-3" />
          </Card>

          <Card className="flex items-center gap-3">
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full"
              style={{ color: cores.financa, backgroundColor: `${cores.financa}1f` }}
            >
              <Chama size={22} />
            </span>
            <div>
              <p className="font-display text-2xl font-bold leading-none text-foreground">
                {streak}{" "}
                <span className="text-base font-normal text-muted">
                  {streak === 1 ? "dia" : "dias"}
                </span>
              </p>
              <Eyebrow>Sequência Invicta</Eyebrow>
            </div>
          </Card>
        </div>
      )}

      <section>
        <SecaoTitulo>Tarefas</SecaoTitulo>
        <ListaRegistros
          tipo="tarefa"
          corAccent={TEAL}
          mostrarValor={false}
          vazio="Nenhuma tarefa registrada."
        />
      </section>

      <section>
        <SecaoTitulo>Hábitos</SecaoTitulo>
        {!habitos ? (
          <p className="text-sm text-muted">Carregando…</p>
        ) : (
          <>
            <FrequenciaSemanal entries={habitosGerais} />
            {habitosGerais.length === 0 ? (
              <EmptyState compacto titulo="Nenhum hábito registrado." />
            ) : (
              <ul className="flex flex-col gap-2">
                {habitosGerais.map((e) => (
                  <EntryRow
                    key={e.id}
                    entry={e}
                    mostrarValor={false}
                    corAccent={TEAL}
                    icone={<Repeticao size={18} />}
                    marcadoHoje={diaISO(new Date(e.createdAt)) === hoje}
                    onSaved={atualizar}
                    onDeleted={remover}
                    onLockToggled={atualizar}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section>
        <SecaoTitulo>Treinos</SecaoTitulo>
        {!habitos ? (
          <p className="text-sm text-muted">Carregando…</p>
        ) : (
          <>
            <FrequenciaSemanal entries={treinos} />
            {treinos.length === 0 ? (
              <EmptyState compacto titulo="Nenhum treino registrado." />
            ) : (
              <ul className="flex flex-col gap-2">
                {treinos.map((e) => (
                  <EntryRow
                    key={e.id}
                    entry={e}
                    mostrarValor={false}
                    corAccent={TEAL}
                    icone={<Halteres size={18} />}
                    marcadoHoje={diaISO(new Date(e.createdAt)) === hoje}
                    onSaved={atualizar}
                    onDeleted={remover}
                    onLockToggled={atualizar}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
