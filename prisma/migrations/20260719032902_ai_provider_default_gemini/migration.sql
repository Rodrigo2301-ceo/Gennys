-- AlterTable
ALTER TABLE "User" ALTER COLUMN "aiProvider" SET DEFAULT 'gemini';

-- Contas criadas antes do seletor existir ficaram com o padrão antigo
-- ("anthropic") sem escolha ativa do usuário. Migra para o novo padrão.
UPDATE "User" SET "aiProvider" = 'gemini' WHERE "aiProvider" = 'anthropic';
