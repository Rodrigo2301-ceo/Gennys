import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, jsonNoStore, secureRoute } from "@/lib/security/errors";
import { RATE_LIMITS } from "@/lib/security/rateLimit";
import { requireCurrentUser } from "@/lib/security/session";
import { legacyDateToCivil } from "@/lib/security/validation";

export async function GET() {
  return secureRoute("account:export", async () => {
    const current = await requireCurrentUser(RATE_LIMITS.accountExport);
    const exportedAt = new Date();

    const data = await prisma.$transaction(
      async (tx) => {
        const [
          user,
          entries,
          memories,
          verseMarks,
          aiUsage,
          aiConsents,
          aiConfirmations,
          reservationPlan,
        ] = await Promise.all([
          tx.user.findUnique({
            where: { id: current.id },
            select: {
              id: true,
              email: true,
              name: true,
              birthDate: true,
              birthDateCivil: true,
              plan: true,
              aiProvider: true,
              createdAt: true,
            },
          }),
          tx.entry.findMany({
            where: { userId: current.id },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              id: true,
              tipo: true,
              dados: true,
              valor: true,
              categoria: true,
              locked: true,
              recurring: true,
              transactionDate: true,
              referenceMonth: true,
              excludeFromTotals: true,
              origemRecorrenteId: true,
              mesReferencia: true,
              createdAt: true,
            },
          }),
          tx.memory.findMany({
            where: { userId: current.id },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              id: true,
              fato: true,
              categoria: true,
              createdAt: true,
            },
          }),
          tx.verseMark.findMany({
            where: { userId: current.id },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: {
              id: true,
              translationCode: true,
              bookCode: true,
              bookName: true,
              chapter: true,
              verse: true,
              texto: true,
              cor: true,
              observacao: true,
              createdAt: true,
              updatedAt: true,
            },
          }),
          tx.iaUsage.findMany({
            where: { userId: current.id },
            orderBy: { dia: "asc" },
            select: { dia: true, chamadas: true, updatedAt: true },
          }),
          tx.aiConsent.findMany({
            where: { userId: current.id },
            orderBy: [{ grantedAt: "asc" }, { id: "asc" }],
            select: {
              id: true,
              provider: true,
              version: true,
              purpose: true,
              grantedAt: true,
              revokedAt: true,
            },
          }),
          tx.aiConfirmation.findMany({
            where: { userId: current.id },
            orderBy: [{ consumedAt: "asc" }, { id: "asc" }],
            select: {
              id: true,
              entryId: true,
              expiresAt: true,
              consumedAt: true,
            },
          }),
          tx.reservationPlan.findUnique({
            where: { userId: current.id },
            select: {
              id: true,
              dados: true,
              createdAt: true,
              updatedAt: true,
            },
          }),
        ]);

        if (!user) {
          throw new ApiError(401, "UNAUTHENTICATED", "Não autenticado.");
        }
        return {
          profile: {
            id: user.id,
            email: user.email,
            name: user.name,
            birthDate: user.birthDateCivil ?? legacyDateToCivil(user.birthDate),
            plan: user.plan,
            aiProvider: user.aiProvider,
            createdAt: user.createdAt,
          },
          entries: entries.map((entry) => ({
            ...entry,
            transactionDate: entry.transactionDate
              ? entry.transactionDate.toISOString().slice(0, 10)
              : null,
          })),
          memories,
          verseMarks,
          aiUsage,
          aiConsents,
          aiConfirmations,
          reservationPlan,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    const date = exportedAt.toISOString().slice(0, 10);
    return jsonNoStore(
      {
        schemaVersion: 1,
        exportedAt: exportedAt.toISOString(),
        data,
      },
      {
        status: 200,
        headers: {
          "Content-Disposition": `attachment; filename="gennys-export-${date}.json"`,
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  });
}
