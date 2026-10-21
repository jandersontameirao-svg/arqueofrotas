# Evidências de validação

- `baseline-tests.log`, `baseline-typescript.log`, `baseline-build.log`: pacote original antes de alterações.
- `baseline-reproduced-failures.log`: seis regressões executadas contra outra extração inalterada do ZIP; falhas esperadas que demonstram os defeitos originais.
- `final-tests.log`: 60 testes aprovados no código corrigido, com banco isolado real e sem ignorados.
- `final-mobile-tests.log`, `browser-results.json`: dois testes de navegador aprovados, incluindo offline, recuperação, acessibilidade automatizada, evidência e conta desativada.
- `final-typescript.log`, `final-build.log`: checagem estática e build finais.
- `test-migrations.log`: migrations aplicadas/conferidas somente no banco local de teste.
- `diff-check.log`: verificação de whitespace.
- `mobile-pickup.png`, `mobile-offline-return.png`: telas de teste com dados sintéticos.

Não há credenciais, tokens de sessão, dump do banco ou dados de produção nos artefatos de entrega. Falhas intermediárias de desenvolvimento e a indisponibilidade do ambiente estão explicadas no relatório; os resultados finais são os arquivos `final-*`.

## Incorporação no projeto existente — 21/10/2026

- `execucao-final-testes-unitarios.log`: 37 testes unitários aprovados, com 23 cenários de banco corretamente ignorados sem URL local autorizada.
- `execucao-final-migrations-integracao.log` e `execucao-final-migrations-mobile.log`: migrations `0000` a `0012` aplicadas exclusivamente no banco efêmero local `arqueofrotas_test` via socket.
- `execucao-final-testes-integracao.log`: 60 testes aprovados em 9 arquivos com banco local isolado.
- `execucao-final-typescript.log` e `execucao-final-build.log`: TypeScript e build aprovados.
- `execucao-final-testes-mobile.log`: 2 testes Playwright aprovados para retirada, devolução offline/reconciliação e revogação de sessão.

O relatório factual desta execução está em `docs/RELATORIO_INCORPORACAO_2026-10-21.md`. Ele também registra a correção da guarda de fixtures, necessária para impedir que testes de banco utilizem uma conexão herdada quando a URL local isolada não é fornecida.

### Reexecução com salvaguardas globais

- `execucao-final-guard-testes-unitarios.log`: confirma que, sem `FLEET_TEST_DATABASE_URL`, o setup global remove `DATABASE_URL`, 37 testes passam e os 23 cenários de banco são ignorados.
- `execucao-final-baseline-0000-0008.log`, `execucao-final-journal-pre-0009.log` e `execucao-final-preflight-0009-0012.log`: simulam o estado existente até `0008` e registram preflight somente de leitura sem inconsistências.
- `execucao-final-migrations-0009-0012-aditivas.log`, `execucao-final-journal-pos-0012.log` e `execucao-final-estruturas-0009-0012.log`: comprovam a aplicação exclusivamente aditiva de `0009` a `0012` e as estruturas resultantes.
- `execucao-final-guard-testes-integracao.log`, `execucao-final-guard-typescript.log`, `execucao-final-guard-build.log` e `execucao-final-guard-testes-mobile.log`: matriz final aprovada depois do endurecimento de isolamento.
