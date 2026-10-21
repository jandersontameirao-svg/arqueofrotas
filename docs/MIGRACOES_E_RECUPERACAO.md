# Migrações e recuperação

Nenhuma migração, seed ou limpeza foi executada em produção. A validação usa somente um banco MariaDB local `arqueofrotas_test`, criado no workspace. O pacote original não inclui dados, credenciais ou uploads.

## Conteúdo aditivo

- `0009_essential_flows`: evidências, leituras, recibos e bloqueios manuais; combustível de retirada/devolução e referência da inspeção de retorno.
- `0010_durability_and_guards`: trava única de uso ativo, eventos, correspondências; preserva veículos anteriormente em manutenção como bloqueios de conferência. Importa usos ativos existentes, sem resolver duplicidades silenciosamente.
- `0011_aggregate_revision`: revisão do veículo e unicidade das correspondências externas.
- `0012_event_acknowledgements`: reconhecimento por consumidor dos eventos duráveis.

Não executam DROP/TRUNCATE nem reescrevem leituras ou arquivos antigos. A trava única fará a migração falhar se já houver dois usos ativos do mesmo veículo ou condutor: investigar e decidir qual registro encerrar com trilha antes de prosseguir.

## Aplicação por responsável, após revisão

1. Fazer backup consistente do banco **e** dos arquivos/storage legado; verificar restauração em clone isolado.
2. Comparar o histórico Drizzle real com `drizzle/meta/_journal.json`, schema e migrações 0000–0008. Não reaplicar migrations antigas em uma base já existente.
3. Executar `pnpm db:preflight` com DATABASE_URL explicitamente configurada para o clone. A rotina é somente leitura e apresenta contagens, sem conteúdo de documentos ou credenciais.
4. Resolver duplicidade de uso, intervalos inválidos, reservas sobrepostas, regressões e tabelas sem transação. Não corrigir produção com SQL genérico sem identificar os registros e o responsável.
5. Aplicar no clone com `pnpm db:migrate`, sem `db:push`: o script legado `db:push` também gera migrations e não deve ser o procedimento de implantação.
6. Conferir dados preservados, novos índices, contagens, histórico e bloqueios herdados; executar testes de aceitação com contas dos quatro perfis.
7. Programar janela e backup imediatamente anterior à aplicação aprovada. MySQL possui DDL com commit implícito: o conjunto de migrations não é atomicamente reversível.

O código precisa das migrations novas antes de receber tráfego. A implantação não foi feita nesta execução.

## Recuperação

Se falhar antes de escrever dados com a nova versão: interromper aplicação, inspecionar o último DDL concluído e o journal; restaurar o clone a partir do backup para ensaiar a retomada. Nunca marcar migração como aplicada sem comparar as tabelas reais. Em produção, usar backup e plano da janela para restaurar integralmente ou completar apenas DDL comprovadamente faltante.

Depois que houver novos comandos: conservar banco com recibos, evidências, leituras e eventos. Reverter somente o binário pode perder acesso operacional aos dados novos e às travas; priorizar correção progressiva, congelar escritas se necessário e reconciliar pelo requestId. Não remover tabelas novas para “voltar” enquanto existirem dados. A recuperação de desastre deve restaurar as novas tabelas junto ao restante da base e arquivos externos.

Os bloqueios herdados de manutenção exigem revisão e liberação do gestor com motivo. Isso preserva restrições cuja origem manual não podia ser provada pelo código original.

## Reproduzir validação isolada

Requer Node 22+, pnpm 10.4.1 e MySQL/MariaDB de teste. Instalar com `corepack pnpm install --frozen-lockfile`.

`TEST_DB_SOCKET=/workspace/test-db.sock pnpm exec tsx scripts/prepare-test-db.ts` aplica migrations somente em `arqueofrotas_test` pelo socket explicitamente localizado no workspace. A opção `--reset` **apaga somente esse banco isolado** e é exclusiva dos testes; o script não aceita um banco operacional.

`FLEET_TEST_DATABASE_URL='mysql://root@localhost/arqueofrotas_test?socketPath=/workspace/test-db.sock' pnpm test:integration` executa a suíte completa com rotas e banco reais. O runner recusa banco remoto ou nome diferente e não ignora silenciosamente ausência da variável. `pnpm test` sem variável executa testes unitários e marca os de banco como ignorados, distinguindo os resultados.

Os testes Playwright requerem Chromium local; `playwright.config.ts` usa `/usr/bin/chromium` neste ambiente. A fixture de browser é sintética, local e com token efêmero de teste; não deve entrar em distribuição. `FLEET_TEST_DATABASE_URL` também é obrigatória em `pnpm test:mobile`: o runner cria um segredo efêmero, compila com OAuth local de teste, cria contas sintéticas, inicia a aplicação na porta 3001, executa o navegador e encerra o servidor. A fixture é removida ao final. A porta deve estar livre. Ajustar o executável de navegador para outro ambiente. Esse build é de teste: reconstruir com a configuração real antes de implantar.

## Ensaio aditivo das migrations 0009–0012

Para confirmar que as migrations novas funcionam sobre uma instalação que já possua o histórico `0000` a `0008`, existem dois scripts exclusivamente para o banco efêmero local. Ambos recusam socket diferente de `/workspace/test-db.sock` e trabalham somente no banco `arqueofrotas_test`.

```bash
export TEST_DB_SOCKET=/workspace/test-db.sock
export DATABASE_URL='mysql://root@localhost/arqueofrotas_test?socketPath=/workspace/test-db.sock'

pnpm db:test-baseline -- --reset   # recria somente o teste com 0000–0008
pnpm db:preflight                  # somente leitura; deve retornar contagens 0
pnpm db:test-review-migrations     # aplica apenas 0009–0012
```

`db:test-baseline` usa `DROP DATABASE` exclusivamente para recriar o banco de nome fixo `arqueofrotas_test` pelo socket local e exige a flag `--reset`; ele não aceita banco operacional. Não utilizar esses scripts em clone de produção nem em produção. Para uma implantação aprovada, seguir o procedimento de backup, clone, preflight e janela descrito nas seções anteriores.
