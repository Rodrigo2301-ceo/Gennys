# Implantação do hardening P0

Esta mudança foi preparada para produção, mas a migration **não deve ser
executada sem backup, restauração testada e janela de observação**.

## O que a migration faz

`20260722060000_p0_hardening` é expansiva e preserva os registros atuais:

- adiciona data civil de nascimento e versão de sessão;
- adiciona data da transação, mês de referência, recorrência independente da
  trava e chave idempotente;
- mantém `birthDate`, `mesReferencia`, `locked` e Entries de plano legadas;
- cria tabelas de consentimento, confirmação hash-only, rate limit e plano de
  reserva singleton;
- copia o plano legado mais recente para a tabela nova, sem apagar históricos;
- atribui chave canônica a apenas uma ocorrência de cada grupo legado
  duplicado, preservando as demais sem chave.

## Pré-implantação obrigatória

1. Revogue no painel do provedor o Deploy Hook que já esteve versionado. O
   valor antigo deve ser considerado comprometido.
2. Configure `SECURITY_HMAC_SECRET` com segredo aleatório de ao menos 32 bytes,
   diferente de `NEXTAUTH_SECRET`.
3. Confirme as chaves somente dos provedores de IA que devem aparecer na UI.
4. Faça snapshot/backup consistente do PostgreSQL e teste a restauração em um
   banco isolado.
5. Execute a migration e a aplicação em staging com uma cópia sanitizada ou
   dados sintéticos; nunca use dados reais nos testes automatizados.
6. Registre, somente de forma agregada, as contagens de usuários, Entries,
   planos e grupos de recorrência antes da alteração.

## Ordem recomendada

1. Coloque a aplicação em modo de deploy controlado, sem executar jobs ou
   scripts paralelos de recorrência.
2. No ambiente correto e após conferir `DATABASE_URL`, execute:

   ```bash
   npx prisma migrate deploy
   ```

3. Valide que a migration terminou e compare as contagens agregadas. Nenhuma
   tabela ou coluna anterior deve ter desaparecido.
4. Publique a nova aplicação.
5. Drene instâncias da versão anterior; os campos legados permitem a curta
   sobreposição durante o rolling deploy.
6. Valide com contas sintéticas:
   - login e invalidação de sessão após troca de senha;
   - consentimento, revogação e confirmação de proposta da IA;
   - exportação e exclusão da conta;
   - lançamento retroativo e virada de mês;
   - duas leituras financeiras concorrentes sem recorrência duplicada;
   - edição do plano sem criar outra linha canônica.
7. Monitore respostas 429/5xx e erros sanitizados, sem habilitar logs de payload.

## Rollback

Se a aplicação precisar voltar, reverta somente o deploy do código. Não remova
as novas colunas/tabelas durante o incidente: a versão anterior ignora a maior
parte delas e os campos legados foram mantidos. Qualquer migration destrutiva
de contração deve ser planejada separadamente, depois de confirmar que não há
mais instâncias antigas e que o backup é restaurável.

## Risco conhecido de dependência

Next.js 14.2.35 é a última versão da major 14 e ainda recebe alertas altos no
`npm audit`. Eliminar esses alertas exige atualização de major, deliberadamente
fora deste hardening. Planeje a migração para uma versão suportada do Next.js em
uma mudança separada, com testes de regressão e rollout próprio.
