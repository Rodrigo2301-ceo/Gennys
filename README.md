# Gennys

Assistente pessoal em português brasileiro, construído com Next.js App Router,
React, TypeScript, Prisma e PostgreSQL.

## Requisitos

- Node.js 22 (Prisma 7 requer uma versão recente suportada)
- PostgreSQL de desenvolvimento isolado
- variáveis locais baseadas em `.env.example`

Nunca use credenciais ou dados de produção durante desenvolvimento e testes.

## Instalação

```bash
npm ci
npm run dev
```

O `postinstall` gera o Prisma Client. A aplicação abre em
`http://localhost:3000`.

## Validação

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit
```

O workflow `.github/workflows/ci.yml` executa essas verificações em pushes e
pull requests usando apenas configurações sintéticas.

## Banco de dados

Crie migrations em banco de desenvolvimento. Não execute migration de produção
como parte de testes ou builds. Para o hardening P0, revise primeiro
`docs/P0_DEPLOY.md`; a ordem exige backup restaurável, migration aditiva e só
depois o deploy da aplicação.

## Privacidade e IA

- somente provedores configurados no servidor aparecem na interface;
- conteúdo não é enviado sem consentimento explícito, vigente e versionado;
- o consentimento pode ser revogado no Perfil;
- propostas da IA exigem confirmação antes de persistir;
- prompts, respostas e dados sensíveis não devem ser registrados em logs.

As regras de produto e design ficam em `CLAUDE.md`; o handoff operacional seguro
fica em `HANDOFF.md`.
