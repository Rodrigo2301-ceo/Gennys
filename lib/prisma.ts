import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 usa o Query Compiler: a conexão com o PostgreSQL vai por um
// driver adapter (pg). Singleton para não abrir várias conexões no dev.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function criarPrisma(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? criarPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
