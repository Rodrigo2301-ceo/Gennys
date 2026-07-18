"use client";

import { useEffect, useMemo, useState } from "react";
import ListaRegistros from "./ListaRegistros";
import { CORES_MODULO } from "@/lib/modules";
import { formatarMinutos } from "@/lib/entryDisplay";
import {
  Badge,
  CabecalhoTela,
  Card,
  Chip,
  Eyebrow,
  HeroNumero,
  IconeTile,
  ProgressBar,
  SecaoTitulo,
} from "@/components/ui/base";
import { Chama, Livro } from "@/components/ui/icones";

const CYAN = CORES_MODULO.estudo; // #22d3ee

interface ResumoEstudos {
  porMateria: { materia: string; minutos: number }[];
  streakDias: number;
  diasEstudadosSemana: string[];
  totalMinutosSemana: number;
}

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

export default function AbaEstudos() {
  const [resumo, setResumo] = useState<ResumoEstudos | null>(null);

  useEffect(() => {
    fetch("/api/estudos/resumo")
      .then((r) => r.json())
      .then(setResumo)
      .catch(() => setResumo(null));
  }, []);

  const dias7 = useMemo(() => ultimosDias(7), []);
  const maxMinutos = Math.max(
    1,
    ...(resumo?.porMateria.map((m) => m.minutos) ?? [0]),
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-grid">
      <CabecalhoTela
        eyebrow="Centro de Comando"
        eyebrowCor={CYAN}
        titulo="Estudos"
        direita={
          resumo ? (
            <Chip icone={<Chama size={13} />} cor="#f59e0b">
              {resumo.streakDias} {resumo.streakDias === 1 ? "dia" : "dias"}
            </Chip>
          ) : undefined
        }
      />

      {resumo && (
        <Card accent={CYAN} glow>
          <Eyebrow cor={CYAN}>Esta semana</Eyebrow>
          <div className="mt-1.5 flex items-end gap-2">
            <HeroNumero cor={CYAN}>
              {formatarMinutos(resumo.totalMinutosSemana)}
            </HeroNumero>
            <span className="mb-1 text-xs text-muted">estudados</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            {dias7.map((d) => {
              const ativo = resumo.diasEstudadosSemana.includes(d);
              return (
                <span
                  key={d}
                  title={d}
                  className="h-2.5 flex-1 rounded-full"
                  style={{
                    backgroundColor: ativo ? CYAN : "rgba(255,255,255,0.10)",
                    boxShadow: ativo ? `0 0 8px -2px ${CYAN}` : undefined,
                  }}
                />
              );
            })}
          </div>
        </Card>
      )}

      <section>
        <SecaoTitulo>Trilhas ativas</SecaoTitulo>
        {!resumo ? (
          <p className="text-sm text-muted">Carregando…</p>
        ) : resumo.porMateria.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhuma matéria esta semana. Conta pro Gennys o que você estudou.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {resumo.porMateria.map((m) => (
              <Card key={m.materia} className="flex items-center gap-3">
                <IconeTile cor={CYAN}>
                  <Livro size={18} />
                </IconeTile>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate capitalize text-foreground">
                      {m.materia}
                    </span>
                    <Badge cor={CYAN}>Em progresso</Badge>
                  </div>
                  <ProgressBar
                    valor={m.minutos / maxMinutos}
                    cor={CYAN}
                    className="mt-1.5"
                  />
                </div>
                <span className="shrink-0 text-sm tabular-nums text-muted">
                  {formatarMinutos(m.minutos)}
                </span>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <SecaoTitulo>Sessões recentes</SecaoTitulo>
        <ListaRegistros
          tipo="estudo"
          corAccent={CYAN}
          mostrarValor={false}
          vazio="Nenhuma sessão de estudo ainda. Conta pro Gennys o que você estudou."
        />
      </section>
    </div>
  );
}
