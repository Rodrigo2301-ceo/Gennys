# GENNYS — Handoff seguro

Aplicação Next.js 14 com App Router, React 18, TypeScript, Prisma 7 e
PostgreSQL. O repositório usa a branch `master`.

## Segurança operacional

- Segredos pertencem somente ao `.env` local ignorado pelo Git e às variáveis
  protegidas do ambiente de hospedagem.
- Nunca registre chaves, tokens, senhas, prompts, respostas da IA, recibos ou
  dados pessoais em documentação ou logs.
- Não mantenha Deploy Hooks em arquivos do repositório. Crie, revogue e acione
  esses hooks exclusivamente no painel do provedor.
- Use bancos separados para desenvolvimento/testes e produção. Nunca execute
  testes ou migrations experimentais contra produção.

## Variáveis de ambiente

Consulte `.env.example`. São esperadas, conforme os provedores habilitados:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `SECURITY_HMAC_SECRET`
- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `ANTHROPIC_API_KEY`

O seletor da aplicação deve mostrar somente provedores cuja chave esteja
configurada no servidor.

## Desenvolvimento e validação

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm audit
```

O Prisma Client é gerado no `postinstall`. O conteúdo de
`app/generated/prisma` é gerado e não deve ser versionado.

## Banco e implantação

Migrations nunca são aplicadas automaticamente por esta documentação. Antes de
uma implantação:

1. faça backup e teste a restauração;
2. revise o SQL da migration;
3. aplique a migration aditiva com `npx prisma migrate deploy` no ambiente
   correto;
4. publique a aplicação somente depois da migration;
5. valide contagens, recorrências, consentimentos e exportação;
6. mantenha rollback da aplicação sem remover os novos campos.

Veja `docs/P0_DEPLOY.md` para a migration de hardening e a ordem detalhada.

## Regras do produto

- O motor de entrada é agnóstico ao canal.
- Dados pessoais, financeiros e religiosos não são enviados a IA sem
  consentimento explícito, vigente e versionado.
- Toda proposta criada por IA precisa de confirmação antes de persistir.
- O Gennys não recomenda produtos de investimento; planejamento de valor de
  reserva é permitido.
- Preserve o design azul-royal, mobile-first, definido em `CLAUDE.md`.
