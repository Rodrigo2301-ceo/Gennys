import {
  FINALIDADE_CONSENTIMENTO_IA,
  VERSAO_CONSENTIMENTO_IA,
  concederConsentimentoIa,
  obterConsentimentoIaVigente,
  revogarConsentimentoIa,
} from "@/lib/ai/consent";
import {
  listarProvedoresDisponiveis,
  provedorEstaDisponivel,
} from "@/lib/ai/availability";
import { obterProvedorIA } from "@/lib/ai/preference";
import { ehProvedorValido, type AiProvider } from "@/lib/ai/providers";
import { EntradaInvalidaError } from "@/lib/engine/errors";
import { ApiError, errorJson } from "@/lib/security/errors";
import {
  assertOnlyKeys,
  parseJsonObject,
} from "@/lib/security/request";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import { requireCurrentUser } from "@/lib/security/session";
import { jsonSemCache, responderErroProcessamento } from "../process/responses";

const MAX_BODY_BYTES = 4 * 1024;
const DESCRICAO_CONSENTIMENTO =
  "Autoriza o envio da sua entrada ao provedor selecionado para classificar e preparar um registro. Nada é salvo sem sua confirmação.";

function validarProvider(valor: unknown): AiProvider {
  if (!ehProvedorValido(valor)) {
    throw new EntradaInvalidaError("Provedor inválido.");
  }
  return valor;
}

function responder(error: unknown) {
  return error instanceof ApiError
    ? errorJson(error)
    : responderErroProcessamento(error);
}

export async function GET() {
  try {
    const user = await requireCurrentUser(RATE_LIMITS.dataRead);
    const provider = await obterProvedorIA(user.id);
    const consentimento = await obterConsentimentoIaVigente(user.id, provider);
    return jsonSemCache({
      provider,
      version: VERSAO_CONSENTIMENTO_IA,
      purpose: FINALIDADE_CONSENTIMENTO_IA,
      descricao: DESCRICAO_CONSENTIMENTO,
      vigente: Boolean(consentimento),
      grantedAt: consentimento?.grantedAt.toISOString() ?? null,
      provedores: listarProvedoresDisponiveis(),
    });
  } catch (error) {
    return responder(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireCurrentUser(RATE_LIMITS.profileWrite);
    const body = await parseJsonObject(req, MAX_BODY_BYTES);
    assertOnlyKeys(body, ["accepted", "provider", "version"]);
    if (
      body.accepted !== true ||
      body.version !== VERSAO_CONSENTIMENTO_IA
    ) {
      throw new EntradaInvalidaError(
        "Consentimento explícito e versão atual são obrigatórios.",
      );
    }
    const provider = validarProvider(body.provider);
    if (!provedorEstaDisponivel(provider)) {
      return jsonSemCache({ error: "Provedor indisponível." }, { status: 409 });
    }
    const consentimento = await concederConsentimentoIa(user.id, provider);
    return jsonSemCache(
      {
        vigente: true,
        provider,
        version: consentimento.version,
        purpose: consentimento.purpose,
        grantedAt: consentimento.grantedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    return responder(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireCurrentUser(RATE_LIMITS.profileWrite);
    const body = await parseJsonObject(req, MAX_BODY_BYTES);
    assertOnlyKeys(body, ["provider"]);
    const provider = validarProvider(body.provider);
    const revogados = await revogarConsentimentoIa(user.id, provider);
    return jsonSemCache({ vigente: false, provider, revogados });
  } catch (error) {
    return responder(error);
  }
}
