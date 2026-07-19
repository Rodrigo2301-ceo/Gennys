-- O provedor "grok" (xAI, pago) foi substituído por "groq" (free tier).
-- Contas que chegaram a escolher grok voltam ao padrão.
UPDATE "User" SET "aiProvider" = 'gemini' WHERE "aiProvider" = 'grok';
