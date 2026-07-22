import { NextResponse } from "next/server";
import {
  FINALIDADE_CONSENTIMENTO_IA,
  VERSAO_CONSENTIMENTO_IA,
  ConsentimentoIaNecessarioError,
} from "@/lib/ai/consent";
import { CotaIaExcedidaError } from "@/lib/ai/usage";
import {
  ConfiguracaoConfirmacaoError,
  ConfirmacaoInvalidaError,
  EntradaInvalidaError,
  ProvedorIaError,
  SaidaIaInvalidaError,
} from "@/lib/engine/errors";
import { CorpoRequisicaoInvalidoError } from "@/lib/ai/http";

const SEM_CACHE = { "Cache-Control": "no-store" };

export function jsonSemCache(body: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, {
    ...init,
    headers: { ...SEM_CACHE, ...init?.headers },
  });
}

export function responderErroProcessamento(erro: unknown): NextResponse {
  if (erro instanceof CorpoRequisicaoInvalidoError) {
    return jsonSemCache(
      { status: "erro", codigo: "entrada_invalida", mensagem: erro.message },
      { status: erro.status },
    );
  }
  if (erro instanceof EntradaInvalidaError) {
    return jsonSemCache(
      { status: "erro", codigo: "entrada_invalida", mensagem: erro.message },
      { status: erro.status },
    );
  }
  if (erro instanceof ConsentimentoIaNecessarioError) {
    return jsonSemCache(
      {
        status: "consentimento_necessario",
        codigo: "consentimento_necessario",
        provider: erro.provider,
        version: VERSAO_CONSENTIMENTO_IA,
        purpose: FINALIDADE_CONSENTIMENTO_IA,
        mensagem: "Autorize o uso de IA antes de enviar conteudo.",
      },
      { status: 428 },
    );
  }
  if (erro instanceof CotaIaExcedidaError) {
    return jsonSemCache(
      {
        status: "erro",
        codigo: "cota_excedida",
        limite: erro.limite,
        mensagem: "Limite diario de IA atingido.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(erro.retryAfterSeconds) },
      },
    );
  }
  if (erro instanceof ProvedorIaError) {
    return jsonSemCache(
      {
        status: "erro",
        codigo: erro.codigo,
        mensagem: "O provedor de IA nao esta disponivel agora.",
      },
      { status: erro.codigo === "provedor_incompativel" ? 422 : 503 },
    );
  }
  if (erro instanceof SaidaIaInvalidaError) {
    return jsonSemCache(
      {
        status: "erro",
        codigo: "saida_invalida",
        mensagem: "A resposta da IA nao pode ser validada.",
      },
      { status: 502 },
    );
  }
  if (erro instanceof ConfirmacaoInvalidaError) {
    return jsonSemCache(
      {
        status: "erro",
        codigo: "confirmacao_invalida",
        mensagem: "Confirmacao invalida ou expirada.",
      },
      { status: 400 },
    );
  }
  if (erro instanceof ConfiguracaoConfirmacaoError) {
    return jsonSemCache(
      {
        status: "erro",
        codigo: "erro_interno",
        mensagem: "O processamento esta temporariamente indisponivel.",
      },
      { status: 503 },
    );
  }
  return jsonSemCache(
    {
      status: "erro",
      codigo: "erro_interno",
      mensagem: "Nao foi possivel processar agora.",
    },
    { status: 500 },
  );
}
