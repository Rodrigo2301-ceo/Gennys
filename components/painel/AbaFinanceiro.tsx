"use client";

import ListaRegistros from "./ListaRegistros";
import PlanoReserva from "./PlanoReserva";
import FluxoCaixa from "./FluxoCaixa";
import ResumoPatrimonio from "./ResumoPatrimonio";
import { CORES_MODULO } from "@/lib/modules";
import type { EntryLike } from "@/lib/entryDisplay";
import { Botao, CabecalhoTela, SecaoTitulo } from "@/components/ui/base";

const AMBER = CORES_MODULO.financa;

export default function AbaFinanceiro({
  onRegistrar,
}: {
  onRegistrar?: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <CabecalhoTela
        eyebrow="Central Financeira"
        eyebrowCor={AMBER}
        titulo="Financeiro"
      />

      {/* Resumo "como estou hoje": saldo acumulado + fluxo do mes financeiro. */}
      <ResumoPatrimonio />

      {onRegistrar && (
        <Botao onClick={onRegistrar} className="w-full">
          + Registrar no chat
        </Botao>
      )}

      <div id="bloco-plano">
        <PlanoReserva onRegistrar={onRegistrar} />
      </div>

      <FluxoCaixa />

      <div>
        <SecaoTitulo>Lançamentos</SecaoTitulo>
        <ListaRegistros
          tipo="financa"
          corAccent={AMBER}
          mostrarValor
          filtro={(e: EntryLike) => e.categoria !== "plano_reserva"}
          vazio="Nenhum lançamento ainda. Fala com o Gennys pra registrar um gasto."
        />
      </div>
    </div>
  );
}
