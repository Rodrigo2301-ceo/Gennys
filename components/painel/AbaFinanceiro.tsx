"use client";

import ListaRegistros from "./ListaRegistros";
import PlanoReserva from "./PlanoReserva";
import FluxoCaixa from "./FluxoCaixa";
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
        eyebrow="Meu Patrimônio"
        eyebrowCor={AMBER}
        titulo="Financeiro"
      />

      <div className="flex gap-2">
        {onRegistrar && (
          <Botao onClick={onRegistrar} className="flex-1">
            + Registrar no chat
          </Botao>
        )}
        <Botao
          variante="ghost"
          seta
          onClick={() =>
            document
              .getElementById("bloco-plano")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          Ajustar
        </Botao>
      </div>

      <div id="bloco-plano">
        <PlanoReserva />
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
