import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { corDoModulo } from "@/lib/modules";
import {
  FINALIDADE_CONSENTIMENTO_IA,
  VERSAO_CONSENTIMENTO_IA,
  exigirConsentimentoIaVigente,
} from "@/lib/ai/consent";
import {
  provedorAceitaImagem,
  provedorEstaDisponivel,
} from "@/lib/ai/availability";
import {
  criarTokenConfirmacao,
  garantirConfiguracaoConfirmacao,
  hashTokenConfirmacao,
  verificarTokenConfirmacao,
} from "@/lib/ai/confirmation";
import { consumirCotaDiariaIA } from "@/lib/ai/usage";
import { obterProvedorIA } from "@/lib/ai/preference";
import { construirSystemPrompt } from "./prompts";
import { categorizarComProvedor } from "./aiProvider";
import {
  ConfirmacaoInvalidaError,
  EntradaInvalidaError,
  ProvedorIaError,
} from "./errors";
import { validarPropostaEntrada } from "./parseCategorizacao";
import type {
  ConfirmacaoEntrada,
  EntradaMotor,
  PropostaEntrada,
  ResultadoConfirmacao,
  ResultadoMotor,
  TipoEntry,
} from "./types";

const LIMIAR_CONFIANCA = 0.7;

export async function processarEntrada(
  entrada: EntradaMotor,
): Promise<ResultadoMotor> {
  const { userId, texto, imagem, historico } = entrada;
  if (!texto && !imagem) throw new EntradaInvalidaError("Entrada invalida.");

  const provider = await obterProvedorIA(userId);
  if (!provedorEstaDisponivel(provider)) {
    throw new ProvedorIaError("provedor_indisponivel");
  }
  if (imagem && !provedorAceitaImagem(provider)) {
    throw new ProvedorIaError("provedor_incompativel");
  }

  const consentimento = await exigirConsentimentoIaVigente(userId, provider);
  garantirConfiguracaoConfirmacao();
  const systemPrompt = construirSystemPrompt([]);

  // Deve ser a ultima operacao aguardada antes da rede: a unidade fica reservada
  // de forma atomica mesmo quando o provedor falha ou excede o timeout.
  await consumirCotaDiariaIA(userId);
  const categorizacao = await categorizarComProvedor(provider, {
    systemPrompt,
    historico,
    texto,
    imagem,
  });

  const valorFinanceiroIncerto =
    categorizacao.tipo === "financa" && categorizacao.valor === null;
  if (categorizacao.confianca < LIMIAR_CONFIANCA || valorFinanceiroIncerto) {
    return {
      status: "pergunta",
      resposta: categorizacao.resposta,
      pergunta:
        categorizacao.pergunta ??
        (valorFinanceiroIncerto
          ? "Confirme o valor exato antes de continuar."
          : "Confirme os detalhes antes de continuar."),
    };
  }

  const proposta = validarPropostaEntrada({
    tipo: categorizacao.tipo,
    confianca: categorizacao.confianca,
    categoria: categorizacao.categoria,
    valor: categorizacao.valor,
    dados: categorizacao.dados,
  });
  const confirmacao = criarTokenConfirmacao(userId, proposta, {
    provider,
    consentVersion: consentimento.version,
    purpose: consentimento.purpose,
  });

  return {
    status: "confirmacao",
    resposta: categorizacao.resposta,
    proposta,
    token: confirmacao.token,
    expiraEm: confirmacao.expiresAt.toISOString(),
  };
}

interface EntryConfirmada {
  id: string;
  tipo: string;
  categoria: string | null;
  valor: Prisma.Decimal | null;
}

function resultadoSalvo(
  entry: EntryConfirmada,
  idempotente: boolean,
): ResultadoConfirmacao {
  return {
    status: "salvo",
    tipo: entry.tipo as TipoEntry,
    resposta: "Registro confirmado e salvo.",
    entryId: entry.id,
    categoria: entry.categoria,
    valor: entry.valor === null ? null : Number(entry.valor),
    moduloCor: corDoModulo(entry.tipo as TipoEntry),
    idempotente,
  };
}

async function buscarConfirmacaoExistente(
  tokenHash: string,
  userId: string,
): Promise<ResultadoConfirmacao | null> {
  const recibo = await prisma.aiConfirmation.findUnique({
    where: { tokenHash },
    select: {
      userId: true,
      entry: {
        select: { id: true, tipo: true, categoria: true, valor: true },
      },
    },
  });
  if (!recibo) return null;
  if (recibo.userId !== userId || !recibo.entry) {
    throw new ConfirmacaoInvalidaError();
  }
  return resultadoSalvo(recibo.entry, true);
}

export async function confirmarEntrada(
  entrada: ConfirmacaoEntrada,
): Promise<ResultadoConfirmacao> {
  const proposta: PropostaEntrada = validarPropostaEntrada(entrada.proposta);
  const verificada = verificarTokenConfirmacao(
    entrada.token,
    entrada.userId,
    proposta,
  );
  if (
    verificada.contexto.consentVersion !== VERSAO_CONSENTIMENTO_IA ||
    verificada.contexto.purpose !== FINALIDADE_CONSENTIMENTO_IA
  ) {
    throw new ConfirmacaoInvalidaError();
  }

  const tokenHash = hashTokenConfirmacao(entrada.token);
  const existente = await buscarConfirmacaoExistente(tokenHash, entrada.userId);
  if (existente) return existente;

  try {
    return await prisma.$transaction(async (tx) => {
      const reciboExistente = await tx.aiConfirmation.findUnique({
        where: { tokenHash },
        select: {
          userId: true,
          entry: {
            select: { id: true, tipo: true, categoria: true, valor: true },
          },
        },
      });
      if (reciboExistente) {
        if (reciboExistente.userId !== entrada.userId || !reciboExistente.entry) {
          throw new ConfirmacaoInvalidaError();
        }
        return resultadoSalvo(reciboExistente.entry, true);
      }

      const entry = await tx.entry.create({
        data: {
          userId: entrada.userId,
          tipo: proposta.tipo,
          dados: proposta.dados as Prisma.InputJsonValue,
          valor: proposta.tipo === "financa" ? proposta.valor : null,
          categoria: proposta.categoria,
        },
        select: { id: true, tipo: true, categoria: true, valor: true },
      });
      await tx.aiConfirmation.create({
        data: {
          userId: entrada.userId,
          tokenHash,
          entryId: entry.id,
          expiresAt: verificada.expiresAt,
        },
      });
      return resultadoSalvo(entry, false);
    });
  } catch (erro) {
    if (erro instanceof ConfirmacaoInvalidaError) throw erro;
    const criadoEmConcorrencia = await buscarConfirmacaoExistente(
      tokenHash,
      entrada.userId,
    );
    if (criadoEmConcorrencia) return criadoEmConcorrencia;
    throw erro;
  }
}
