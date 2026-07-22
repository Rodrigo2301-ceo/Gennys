# GENNYS — Handoff de progresso

Assistente de vida pessoal com IA para jovens brasileiros. Em produção em
**https://www.gennys.com.br**. Este doc resume o estado atual pra continuar o
trabalho (ex.: no Codex). Nenhum segredo aqui — chaves ficam no `.env` local
(gitignored) e nas Environment Variables da Vercel.

## Stack
- **Next.js 14.2.35** (App Router) + React 18 + TypeScript + Tailwind.
- **Prisma 7.8** com driver adapter `@prisma/adapter-pg` (client gerado em
  `app/generated/prisma`, que é **gitignored** — a Vercel regenera no build via
  `postinstall: prisma generate`).
- **PostgreSQL no Neon** (dois bancos: um de dev, um de produção).
- **NextAuth** (Credentials + JWT), bcrypt.
- **IA multi-provedor** (ver abaixo): `@anthropic-ai/sdk` + chamadas REST a
  Gemini e Groq.
- 3D: `@react-three/fiber` + `drei` + `three` (átomo da home).

## Infra / deploy
- Repo GitHub: `Rodrigo2301-ceo/Gennys`, branch **`master`**.
- Deploy na **Vercel** (plano Hobby). O webhook automático do GitHub falhou no
  passado; use o **Deploy Hook** pra disparar build:
  `POST https://api.vercel.com/v1/integrations/deploy/prj_3UFrJVRCMJl3YFCAcFTxtV6iIMzH/HaXdkMV9uz`
  (nas últimas vezes o build subiu pro domínio sozinho; se ficar "Ready" sem ir
  pro ar, promover manual em Deployments → Promote to Production, ou ligar
  "Auto-assign Custom Production Domains" em Settings → Environments → Production).
- Domínio `gennys.com.br` (GoDaddy) → `www.gennys.com.br` (canônico) com SSL da Vercel.
- **Env vars de produção** (Vercel): `DATABASE_URL`, `NEXTAUTH_SECRET`,
  `NEXTAUTH_URL=https://www.gennys.com.br`, `GEMINI_API_KEY`, `GROQ_API_KEY`.
  (Existem várias `BATABASE_*` da integração Neon com prefixo digitado errado —
  inofensivas; a que vale é `DATABASE_URL`.)
- **Migrations/seed em produção**: rodar localmente com `DATABASE_URL` de prod
  (`npx prisma migrate deploy`, `npx tsx scripts/importBiblia.ts`). A Bíblia
  (Almeida 1911, ~31k versículos) já foi importada em prod.

## IA multi-provedor (importante)
- Usuário escolhe o "cérebro" no seletor do cabeçalho da home (`SeletorModelo.tsx`).
- Provedores em `lib/ai/providers.ts`: **`gemini`** (padrão, free tier),
  **`groq`** (Llama 3.3, free tier), **`anthropic`** (Claude — só funciona se
  houver `ANTHROPIC_API_KEY`, hoje NÃO há).
- Preferência salva em `User.aiProvider`; lida por `lib/ai/preference.ts`.
- Dispatcher server-only: `lib/engine/aiProvider.ts` → implementações em
  `lib/engine/{gemini,groq,anthropic}.ts` (contrato: `categorizar` + `responderTexto`).
- **Groq não tem modelo com visão no free tier**: fotos caem num aviso pedindo
  pra trocar pro Gemini.
- ⚠️ **Bug já corrigido**: o client Prisma gerado estava defasado com
  `@default("anthropic")`, então cadastros novos nasciam com IA quebrada. Agora
  `app/api/register/route.ts` define `aiProvider: PROVEDOR_PADRAO` explicitamente.

## Design system
- Regras visuais em `CLAUDE.md` (dark azul-royal, mobile-first, ref Linear/Raycast).
- **Tokens centrais**: `lib/theme.ts` (uso em `style` inline) espelham
  `app/globals.css` (`:root`) e `tailwind.config.ts`. Cores: royal/glow/mod/data
  + `income` (#34d399 verde) / `expense` (#ef4444 vermelho) + `soft` (#c0c3d4).
- **Primitivos reutilizáveis** em `components/ui/base.tsx`: `Card`, `Botao`,
  `CabecalhoTela`, `Eyebrow`, `HeroNumero`, `ProgressBar`, `Chip`, `Badge`,
  `IconeTile`, `SecaoTitulo`, e os novos **`EmptyState`** e **`NavPill`** (pill de
  navegação com glow). Ícones em `components/ui/icones.tsx`.

## Feito nesta sessão
1. **Segurança/deploy**: security headers + CSP (`next.config.mjs`), rate limiting
   no Vercel Firewall (register + login), `postinstall` prisma generate, try/catch
   no register. Auditoria confirmou sem IDOR (rotas escopam por `session.user.id`).
2. **IA multi-provedor** + seletor visual (Gemini/Llama/Claude), campo
   `User.aiProvider` (migrations aplicadas em dev e prod).
3. **Redesign da home + átomo 3D** (`components/atom/*`, `GennysApp.tsx`,
   `ChatInput.tsx`): fundo azul-marinho, saudação, input glassmorphism, átomo
   cromado com órbitas reais (elétrons giram sobre anéis fixos; respeita
   reduzir-movimento sem congelar).
4. **Refinamento do painel** (`PainelLateral.tsx` + 5 abas): tokens centralizados,
   `EmptyState`/`NavPill`, pill ativo com glow, transição de aba (`.aba-fade`),
   X do cabeçalho ≥44px, empty states padronizados nas 5 abas, bug de dev da
   Bíblia corrigido (mensagem amigável; comando só em dev).
5. **Financeiro Bloco 1**: sugestão não mostra "R$ 0,00" sem renda (CTA pra
   registrar); "Pergunte ao Gennys" com retry+loading+fallback+"Tentar de novo";
   meta com racional ("6 meses das despesas") e modo "Por prazo" com data-alvo.
6. **Financeiro Bloco 2**: card "Meu Patrimônio" (patrimônio acumulado + fluxo do
   mês Ganhei/Gastei/Sobra em verde/vermelho), barra de progresso + projeção na
   meta, unificação do "Ajustar".

Arquivos financeiros-chave: `components/painel/AbaFinanceiro.tsx`,
`PlanoReserva.tsx`, `ResumoPatrimonio.tsx`, `FluxoCaixa.tsx`, `ListaRegistros.tsx`,
`EntryRow.tsx`; lógica em `lib/finance/{reserva,resumo,assistente}.ts`; rotas em
`app/api/reserva/*` e `app/api/entries/*`.

## Pendente — Financeiro Blocos 3, 4, 5 (do prompt do usuário)
**Bloco 3 — Lançamentos e categorias**
- (7) Categorias com ícone + cor próprios (não genérico); sem "despesa" como nome
  de categoria; corrigir truncamento ("alimen…").
- (8) Aplicar verde (`income`) / vermelho (`expense`) na lista E no gráfico
  (hoje `FluxoCaixa.tsx` ainda usa lavanda/coral `data.in/out` — trocar).
- (9) Lista agrupada por dia, total do período, busca/filtro; datas sem truncar.
- (10) Ícones de ação (editar/excluir) afastados, área de toque maior,
  confirmação antes de excluir; remover cadeado se não tiver função clara
  (`EntryRow.tsx`).
- (11) Botão "+" de registro rápido (valor + categoria em ≤3 toques, sem chat).

**Bloco 4 — Gráfico fluxo de caixa (`FluxoCaixa.tsx`)**
- (12) Não mostrar 5 meses zerados pra usuário novo; só desde o cadastro.
- (13) Valores no eixo Y, seletor de período (mês/3m/6m/ano), linha de saldo,
  legenda "Ganhei/Gastei" em verde/vermelho.

**Bloco 5 — Polimento geral**
- (14) Mover "Excluir minha conta" pra dentro de Configurações (não no rodapé
  fixo). Hoje em `ExcluirConta.tsx`, chamado no rodapé de `PainelLateral.tsx`.
- (15) Corrigir placeholders cortados; ajustar fonte/padding dos inputs.
- (16) Contraste AA nos cinzas — usar `text-soft` no lugar de `text-muted` onde
  for texto de apoio (o token `--soft` já existe).
- Trocar prosa longa pra fonte de leitura (Inter) mantendo mono nos números
  (decisão de tipografia ainda não aplicada globalmente — `app/layout.tsx`).

## Como rodar/testar/deployar
- Dev: `npm run dev` (porta 3000). **Atenção OneDrive**: a pasta `.next` às vezes
  trava com `EBUSY` — se acontecer, parar o server, `rm -rf .next`, subir de novo.
- Type-check: `npx tsc --noEmit`.
- Deploy: commit + push `master` → disparar o Deploy Hook (acima).
- Seed Bíblia: `npm run seed:biblia` (usa `DATABASE_URL` do `.env`).
- Convenções: código e nomes em **pt-BR**, mobile-first, seguir `CLAUDE.md`
  (disciplina: uma fase por vez, não criar escopo não pedido).
