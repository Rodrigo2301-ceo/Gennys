-- P0 hardening: migration aditiva e compativel com a versao anterior.
-- Nao remove, renomeia nem sobrescreve registros legados.

-- Datas civis ficam separadas de timestamps.
ALTER TABLE "User" ADD COLUMN "birthDateCivil" TEXT;
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

UPDATE "User"
SET "birthDateCivil" = TO_CHAR("birthDate", 'YYYY-MM-DD')
WHERE "birthDate" IS NOT NULL AND "birthDateCivil" IS NULL;

-- Data financeira real, mes de referencia e recorrencia independente da trava.
ALTER TABLE "Entry"
  ADD COLUMN "recurring" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "transactionDate" DATE,
  ADD COLUMN "referenceMonth" TEXT,
  ADD COLUMN "recurrenceKey" TEXT,
  ADD COLUMN "excludeFromTotals" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Entry"
SET "transactionDate" = CASE
  WHEN "tipo" = 'financa'
    AND COALESCE("dados"->>'data', '') ~ '^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])$'
    AND TO_CHAR(TO_DATE("dados"->>'data', 'YYYY-MM-DD'), 'YYYY-MM-DD') = "dados"->>'data'
    THEN TO_DATE("dados"->>'data', 'YYYY-MM-DD')
  WHEN "tipo" = 'financa'
    THEN ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date
  ELSE NULL
END
WHERE "transactionDate" IS NULL;

-- Ocorrencias catch-up antigas foram criadas no dia do carregamento. Reposiciona
-- a data para o mes que elas representam, preservando o dia quando ele existe.
UPDATE "Entry"
SET "transactionDate" = (
  TO_DATE("mesReferencia" || '-01', 'YYYY-MM-DD')
  + (
      LEAST(
        EXTRACT(DAY FROM "transactionDate")::integer,
        EXTRACT(
          DAY FROM (
            TO_DATE("mesReferencia" || '-01', 'YYYY-MM-DD')
            + INTERVAL '1 month - 1 day'
          )
        )::integer
      ) - 1
    ) * INTERVAL '1 day'
)::date
WHERE "origemRecorrenteId" IS NOT NULL
  AND COALESCE("mesReferencia", '') ~ '^[0-9]{4}-(0[1-9]|1[0-2])$';

UPDATE "Entry"
SET "referenceMonth" = COALESCE(
  "mesReferencia",
  TO_CHAR("transactionDate", 'YYYY-MM')
)
WHERE "tipo" = 'financa' AND "referenceMonth" IS NULL;

-- Preserva a intencao dos templates antigos; locked continua intacto e passa a
-- representar somente imutabilidade na nova aplicacao.
UPDATE "Entry"
SET "recurring" = true
WHERE "tipo" = 'financa'
  AND "locked" = true
  AND "origemRecorrenteId" IS NULL;

-- Se ja houver duplicatas legadas, apenas uma recebe a chave canonica. Nenhum
-- registro e apagado; a unicidade impede novas duplicacoes concorrentes.
WITH ranked AS (
  SELECT
    "id",
    "origemRecorrenteId",
    "referenceMonth",
    ROW_NUMBER() OVER (
      PARTITION BY "origemRecorrenteId", "referenceMonth"
      ORDER BY "createdAt", "id"
    ) AS rn
  FROM "Entry"
  WHERE "origemRecorrenteId" IS NOT NULL AND "referenceMonth" IS NOT NULL
)
UPDATE "Entry" AS e
SET "recurrenceKey" = r."origemRecorrenteId" || ':' || r."referenceMonth"
FROM ranked AS r
WHERE e."id" = r."id" AND r.rn = 1;

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "origemRecorrenteId", "referenceMonth"
      ORDER BY "createdAt", "id"
    ) AS rn
  FROM "Entry"
  WHERE "origemRecorrenteId" IS NOT NULL AND "referenceMonth" IS NOT NULL
)
UPDATE "Entry" AS e
SET "excludeFromTotals" = true
FROM ranked AS r
WHERE e."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX "Entry_recurrenceKey_key" ON "Entry"("recurrenceKey");
CREATE INDEX "Entry_userId_referenceMonth_idx" ON "Entry"("userId", "referenceMonth");

-- Consentimento explicito e versionado para IA.
CREATE TABLE "AiConsent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "purpose" TEXT NOT NULL DEFAULT 'assistente',
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "AiConsent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiConsent_userId_provider_version_revokedAt_idx"
  ON "AiConsent"("userId", "provider", "version", "revokedAt");

ALTER TABLE "AiConsent" ADD CONSTRAINT "AiConsent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Recibo hash-only para confirmacoes idempotentes.
CREATE TABLE "AiConfirmation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "entryId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiConfirmation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiConfirmation_tokenHash_key" ON "AiConfirmation"("tokenHash");
CREATE UNIQUE INDEX "AiConfirmation_entryId_key" ON "AiConfirmation"("entryId");
CREATE INDEX "AiConfirmation_userId_consumedAt_idx" ON "AiConfirmation"("userId", "consumedAt");

ALTER TABLE "AiConfirmation" ADD CONSTRAINT "AiConfirmation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiConfirmation" ADD CONSTRAINT "AiConfirmation_entryId_fkey"
  FOREIGN KEY ("entryId") REFERENCES "Entry"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Rate limiting duravel. O identificador armazenado e sempre derivado por HMAC.
CREATE TABLE "RateLimit" (
  "id" TEXT NOT NULL,
  "identifierHash" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RateLimit_identifierHash_action_windowStart_key"
  ON "RateLimit"("identifierHash", "action", "windowStart");
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");

-- Singleton para o plano de reserva. As Entries antigas permanecem preservadas.
CREATE TABLE "ReservationPlan" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dados" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReservationPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReservationPlan_userId_key" ON "ReservationPlan"("userId");

ALTER TABLE "ReservationPlan" ADD CONSTRAINT "ReservationPlan_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ReservationPlan" ("id", "userId", "dados", "createdAt", "updatedAt")
SELECT
  'legacy_' || MD5(p."userId"),
  p."userId",
  p."dados",
  p."createdAt",
  p."createdAt"
FROM (
  SELECT DISTINCT ON ("userId")
    "userId", "dados", "createdAt"
  FROM "Entry"
  WHERE "tipo" = 'financa' AND "categoria" = 'plano_reserva'
  ORDER BY "userId", "createdAt" DESC, "id" DESC
) AS p
ON CONFLICT ("userId") DO NOTHING;
