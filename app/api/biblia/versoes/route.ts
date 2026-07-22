import { prisma } from "@/lib/prisma";
import { ApiError, okJson, secureRoute } from "@/lib/security/errors";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import { requireCurrentUser } from "@/lib/security/session";

export async function GET(req: Request) {
  return secureRoute("bible:translations", async () => {
    await requireCurrentUser(RATE_LIMITS.bibleRead);
    if (Array.from(new URL(req.url).searchParams.keys()).length > 0) {
      throw new ApiError(400, "INVALID_QUERY", "Parâmetros inválidos.");
    }
    const versoes = await prisma.bibleTranslation.findMany({
      select: { code: true, name: true, year: true },
      orderBy: { name: "asc" },
    });
    return okJson({ versoes });
  });
}
