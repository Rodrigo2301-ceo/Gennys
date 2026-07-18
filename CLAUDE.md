# GENNYS — Regras do Projeto

## Identidade visual
- Dark mode AZUL ROYAL: fundo `#0A1128` / `#001845` / `#0F1E3D`, acentos `#1E40AF` / `#2563EB`, brilhos ciano `#67E8F9` e azul-claro `#93C5FD`. NUNCA preto puro ou cinza genérico.
- Cores por módulo: financeiro=âmbar `#F59E0B`, produtividade/hábito=verde-azulado `#14B8A6`, estudos=ciano `#22D3EE`, Bíblia=azul-claro `#93C5FD`.
- Qualidade referência: Linear/Raycast/Vercel. Mobile-first sempre.

## Regras de IA
- Modelo: `claude-sonnet-4-6` via `@anthropic-ai/sdk`. Key em `ANTHROPIC_API_KEY`, NUNCA no client.
- Toda resposta da IA em português brasileiro natural, tom jovem sem forçar.
- Se confiança baixa na categorização: PERGUNTAR antes de salvar. Nunca registrar valor financeiro incerto.
- PROIBIDO: o Gennys nunca recomenda produtos de investimento (ações, CDB, fundos, cripto, corretoras). Se perguntado, responde que não indica aplicações e sugere profissional certificado. Plano de reserva (quanto guardar/mês) é permitido.

## Arquitetura
- O serviço de processamento de entrada deve ser agnóstico ao canal (hoje: chat do app; futuro: webhook WhatsApp). Nunca acoplar a lógica de IA à UI.
- Campo `User.plan` existe mas SEM paywall, SEM tela de pagamento nesta etapa.

## Disciplina
- Uma fase por vez. Ao terminar qualquer tarefa, listar o que foi feito e AGUARDAR OK antes de continuar.
- Não criar funcionalidades não pedidas. Não "melhorar" escopo por conta própria.
