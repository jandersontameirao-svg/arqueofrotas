# ArqueoFrotas — relatório de incorporação da revisão

**Data:** 21 de outubro de 2026  
**Base preservada:** `d11335722371a586ec2413960ab2ee297d83d337`  
**Ramo local de revisão:** `review/incorporacao-20261021`

## Escopo efetivamente incorporado

A revisão recebida foi comparada com o projeto existente e com `review/ALTERACOES.patch`. O projeto local estava no mesmo commit-base declarado; as únicas alterações locais anteriores eram `.gitignore` e `todo.md`.

Foram incorporados **107 arquivos** listados no patch, sem substituir a árvore inteira. Foram preservados localmente:

- `.gitignore`, incluindo a exclusão de `.project-config.json` com configuração sensível;
- `todo.md`, incluindo o histórico do projeto e o plano desta incorporação;
- `.project-config.json`, `.manus-logs`, dados do banco, documentos e uploads existentes.

Foi criado um backup local verificável antes da incorporação em `/home/ubuntu/backups/arqueofrotas_pre_revisao_20261021`, contendo bundle Git, patch das alterações locais e checksums. Não houve publicação, checkpoint de publicação, migração em produção, limpeza, seed operacional, conexão à Atena OS, pagamento, mensagem externa, criação de agente ou instalação de skill.

## Comportamento incorporado

### Identidade e autorização

- O contexto de cada requisição reconsulta a identidade e recusa conta desativada, inclusive com cookie de sessão anterior.
- Procedimentos protegidos revalidam atividade e papel dentro da transação de escrita.
- A regra aprovada de acesso à frota integral do Grupo Arqueo foi mantida. `unitId` é filtro organizacional e não é interpretado como empresa ou limite de acesso.
- Restrições por operação continuam no servidor: autoria de checklist/ocorrência, reserva própria e execução de OS somente quando atribuída à manutenção.
- A extração assistida de veículo passou a exigir a permissão de gerenciamento de veículos.

### Operação, integridade e recuperação

- Checklists validam template aplicável, respostas exatas, ausência de duplicidade e evidência obrigatória para `Não OK`.
- Novas evidências validam conteúdo JPEG/PNG/WebP, tamanho e hash; ficam protegidas por endpoint autenticado.
- Quilometragem usa regra centralizada, impede regressão normal e conserva histórico/correção justificada.
- Retirada exige confirmação online do servidor; inspeção crítica pode confirmar com resultado `blocked`, sem criar uso ativo.
- Devolução offline permanece pendente; o veículo não é anunciado como disponível antes da reconciliação.
- Comandos usam `requestId` e `idempotencyKey`; a repetição com o mesmo conteúdo recupera o recibo, e conteúdo diferente retorna conflito.
- Elegibilidade de liberação cruza uso ativo, reservas, ocorrências críticas, OS impeditivas e bloqueios manuais. Concluir uma OS não remove outra restrição aberta.
- OS, manutenção, ocorrência, relatórios, reservas, retirada e devolução foram movidos para regras de domínio com autorização e transação.

### Mobile, offline e integração

- A rota `/driver` entrega os percursos de Retirar veículo, Devolver veículo e Informar problema.
- Rascunhos e fila offline são separados por usuário e preservam fotos até confirmação explícita do servidor.
- A PWA armazena apenas shell estático; `/api/` e fotos não entram no cache público.
- O contrato de integração Atena v1 foi incorporado somente como contrato local e executor simulado. Nenhum transporte, credencial ou conector externo foi habilitado.

## Segurança de testes adicionada durante esta incorporação

A primeira execução de `pnpm test` sem a variável `FLEET_TEST_DATABASE_URL` revelou que o último caso de `flows.integration.test.ts` estava fora de `describe.skipIf(!enabled)`. Ele tentou criar uma fixture usando a variável `DATABASE_URL` herdada do ambiente e falhou na inserção de veículo pela ausência da coluna `revision`.

A execução foi interrompida imediatamente. Não foram feitas consultas, migrações, limpezas ou tentativas de correção no banco configurado pelo ambiente. Como a variável de conexão não foi inspecionada para não acessar infraestrutura externa, esse evento deve ser tratado como **possível tentativa de escrita fora do banco isolado**, sem confirmação do destino ou do efeito. Nenhuma remoção foi executada para não interferir em dados externos.

A correção incorporada tem duas camadas:

1. o caso de reserva agora usa `it.skipIf(!enabled)`;
2. `fixture()` agora exige explicitamente `FLEET_TEST_DATABASE_URL` para `localhost`/`127.0.0.1` e banco `arqueofrotas_test`, antes de solicitar uma conexão.

A salvaguarda foi então reforçada globalmente: `server/test-isolation.ts` é carregado antes de toda suíte Vitest, remove `DATABASE_URL` quando não há URL de teste e só permite `FLEET_TEST_DATABASE_URL` com `localhost`/`127.0.0.1`, banco `arqueofrotas_test` e socket `/workspace/test-db.sock`. Os executores `test:integration` e `test:mobile` exigem o mesmo socket. Assim, uma configuração TCP ou uma URL herdada não pode voltar a ser usada pela matriz de testes.

Com isso, testes sem banco isolado não criam fixtures e não usam `DATABASE_URL` por acidente.

## Validação executada nesta instância

O banco de validação foi MariaDB `10.11.14`, criado no sandbox em diretório efêmero `/workspace/arqueofrotas-mariadb`, acessível apenas pelo socket `/workspace/test-db.sock` e sem porta TCP (`@@port = 0`). Nenhuma conexão externa foi usada nas rodadas finais.

| Etapa | Comando / ambiente | Resultado |
| --- | --- | --- |
| Testes unitários sem banco | `pnpm test`, sem `FLEET_TEST_DATABASE_URL` | 37 aprovados; 23 cenários de banco corretamente ignorados |
| Baseline de migrations | `pnpm db:test-baseline -- --reset` com socket local | apenas `0000` a `0008` aplicadas em `arqueofrotas_test` |
| Preflight aditivo | `pnpm db:preflight` com URL do socket local | sem duplicidade de uso/condutor, intervalo inválido, regressão, sobreposição ou tabela não transacional |
| Ensaio de migrations | `pnpm db:test-review-migrations` com socket local | somente `0009` a `0012` aplicadas sobre o baseline `0000` a `0008`; tabelas, índices e `vehicles.revision` verificados |
| Integração | `FLEET_TEST_DATABASE_URL` local + `pnpm test:integration` | 9 arquivos e 60 testes aprovados |
| TypeScript | `pnpm run check` | aprovado |
| Build | `pnpm run build` | aprovado; permanece aviso de chunk JavaScript acima de 500 kB |
| Mobile/Playwright | `FLEET_TEST_DATABASE_URL` local + `pnpm test:mobile` | 2 testes aprovados |

Os logs da última matriz com as salvaguardas ativas estão em `validation/execucao-final-guard-*.log`; o ensaio aditivo está nos arquivos `validation/execucao-final-*-0009-0012*.log`.

## Estado de validação

### Implementado e testado

As correções de autenticação, autorização, checklists, fotos, quilometragem, ocorrências, manutenção, OS, reservas, retirada, devolução, `/driver`, fila offline e contratos locais foram incorporadas e cobertas pelas rodadas acima.

### Implementado sem validação externa

Manifesto/PWA, armazenamento local de evidências, contrato Atena v1, eventos, recibos e referências foram validados localmente ou por testes simulados. Não houve validação com credenciais OAuth externas, storage legado real, Atena OS ou bases de cadastros centrais.

### Bloqueado ou pendente de homologação externa

- aplicação das migrations em clone e produção real, após backup/restauração e saneamento de duplicidades;
- autenticação OAuth Manus real e permissões do storage legado;
- integração bilateral e autenticação delegada real com Atena OS;
- instalação PWA, câmera, pressão de armazenamento e acessibilidade em Android/iPhone físicos;
- revisão administrativa do evento de tentativa de fixture ocorrido antes da guarda de teste, sem executar qualquer ação adicional fora do ambiente isolado.

A versão permanece disponível apenas para revisão técnica local; nenhum deploy foi disparado.
