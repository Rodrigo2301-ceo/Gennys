import { prisma } from "@/lib/prisma";
import { okJson, secureRoute } from "@/lib/security/errors";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import { requireCurrentUser } from "@/lib/security/session";

export async function GET() {
  return secureRoute("memories:list", async () => {
    const current = await requireCurrentUser(RATE_LIMITS.dataRead);
    const memories = await prisma.memory.findMany({
      where: { userId: current.id },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        fato: true,
        categoria: true,
        createdAt: true,
      },
    });
    return okJson({ memories, limit: 300 });
  });
}
