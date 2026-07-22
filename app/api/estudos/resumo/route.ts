import { calcularResumoEstudos } from "@/lib/study/estatisticas";
import { okJson, secureRoute } from "@/lib/security/errors";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import { requireCurrentUser } from "@/lib/security/session";

export async function GET() {
  return secureRoute("studies:summary", async () => {
    const current = await requireCurrentUser(RATE_LIMITS.dataRead);
    return okJson(await calcularResumoEstudos(current.id));
  });
}
