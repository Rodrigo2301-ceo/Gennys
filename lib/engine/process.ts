import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { corDoModulo } from "@/lib/modules";
import { construirSystemPrompt } from "./prompts";
import { categorizarComProvedor } from "./aiProvider";
import { carregarMemorias, salvarMemorias } from "./memory";
import { registrarInteracaoIA } from "@/lib/ai/usage";
import { obterProvedorIA } from "@/lib/ai/preference";
import type { EntradaMotor, ResultadoMotor } from "./types";

const LIMIAR_CONFIANCA = 0.7;

// Ponto de entrada ÚNICO e agnóstico ao canal.
// Chat do app hoje; webhook do WhatsApp amanhã — ambos chamam isto.
export async function processarEntrada(
  entrada: EntradaMotor,
): Promise<ResultadoMotor> {
  const { userId, texto, imagem, historico } = entrada;

  if (!texto?.trim() && !imagem) {
    return { status: "erro", mensagem: "Envie um texto ou uma imagem." };
  }

  try {
    // 1. Cérebro: memórias do usuário entram no contexto.
    const memorias = await carregarMemorias(userId);
    const systemPrompt = construirSystemPrompt(memorias);

    // 2. IA classifica + extrai memórias (com o provedor escolhido pelo usuário).
    const provedor = await obterProvedorIA(userId);
    const cat = await categorizarComProvedor(provedor, {
      systemPrompt,
      historico,
      texto,
      imagem,
    });

    // Mede o uso de IA por usuário/dia (só conta, não bloqueia).
    await registrarInteracaoIA(userId);

    // 3. Guarda memórias novas (o Gennys nunca esquece).
    await salvarMemorias(userId, cat.memorias);

    // 4. Regra de confiança: pergunta antes de salvar quando incerto.
    const valorFinanceiroIncerto =
      cat.tipo === "financa" && (cat.valor === null || cat.valor === undefined);

    if (cat.confianca < LIMIAR_CONFIANCA || valorFinanceiroIncerto) {
      const pergunta =
        cat.pergunta ??
        (valorFinanceiroIncerto
          ? "Qual foi o valor exato?"
          : "Pode me dar mais detalhes pra eu registrar certinho?");
      return {
        status: "pergunta",
        resposta: cat.resposta,
        pergunta,
      };
    }

    // 5. Salva o Entry no PostgreSQL.
    const entry = await prisma.entry.create({
      data: {
        userId,
        tipo: cat.tipo,
        dados: cat.dados as unknown as Prisma.InputJsonValue,
        valor: cat.tipo === "financa" ? cat.valor : null,
        categoria: cat.categoria,
      },
      select: { id: true },
    });

    return {
      status: "salvo",
      tipo: cat.tipo,
      resposta: cat.resposta,
      entryId: entry.id,
      categoria: cat.categoria,
      valor: cat.tipo === "financa" ? cat.valor : null,
      moduloCor: corDoModulo(cat.tipo),
    };
  } catch (err) {
    console.error("[motor] erro ao processar entrada:", err);
    return {
      status: "erro",
      mensagem: "Não consegui processar agora. Tente de novo em instantes.",
    };
  }
}
