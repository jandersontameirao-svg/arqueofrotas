# ArqueoFrotas — arquitetura e regras da revisão

Base declarada: d11335722371a586ec2413960ab2ee297d83d337. O ZIP não contém `.git`; o manifesto confere para os arquivos de conteúdo, mas contém um checksum inválido de si próprio. Não foi identificada outra versão de código. O histórico local começa em uma importação identificada como baseline e não se apresenta como histórico original.

Fontes: código, onboarding PDF de 14 páginas, Capítulo 03 v2 de 20/10/2026 e decisão do usuário nesta execução: **permitir acesso à frota inteira do Grupo Arqueo**.

## Organização e autorização

Empresa é a entidade jurídica; unidade é uma divisão operacional; projeto é um vínculo de trabalho/centro de custo. A autorização desta instalação abrange o Grupo Arqueo. `unitId` organiza e filtra, sem funcionar como limite de empresa. Projetos e veículos podem indicar unidade; o projeto padrão do veículo apenas oferece um valor inicial. Nenhuma empresa foi inferida, cadastrada ou migrada a partir de uma unidade. O cadastro canônico e a correspondência de empresas dependem da futura integração; os contratos preservam `companyId` separado, inclusive nulo quando desconhecido. Não existe promessa de isolamento multiempresa nesta configuração aprovada.

| Operação                                            | Admin       | Gestor      | Motorista                           | Manutenção                |
| --------------------------------------------------- | ----------- | ----------- | ----------------------------------- | ------------------------- |
| Consultar veículos e dados operacionais da frota    | Sim         | Sim         | Sim                                 | Sim                       |
| Criar/alterar veículo, ajustar km com motivo        | Sim         | Sim         | Não                                 | Não                       |
| Desativar veículo                                   | Sim         | Não         | Não                                 | Não                       |
| Administrar usuários, unidades, projetos, templates | Sim         | Não         | Não                                 | Não                       |
| Criar checklist e problema                          | Sim         | Sim         | Sim, autoria da sessão              | Sim, autoria da sessão    |
| Histórico individual de checklist/ocorrência        | Completo    | Completo    | Próprios; sem acesso cruzado por ID | Leitura operacional       |
| Criar/cancelar reserva administrativa               | Sim         | Sim         | Cancelar própria agendada           | Cancelar própria agendada |
| Retirar/devolver                                    | Próprio uso | Próprio uso | Próprio uso                         | Próprio uso               |
| Criar, aprovar, rejeitar, cancelar OS               | Sim         | Sim         | Não                                 | Não                       |
| Executar OS / anexar itens                          | Sim         | Sim         | Não                                 | Apenas OS atribuída       |
| Encerrar ocorrência                                 | Sim         | Sim         | Não                                 | Não                       |
| Exportar relatórios gerenciais                      | Sim         | Sim         | Não                                 | Não                       |
| Auditar registros e mapear referências centrais     | Sim         | Não         | Não                                 | Não                       |

Os endpoints aplicam essas decisões no servidor. O contexto OAuth consulta o usuário atual a cada pedido e rejeita conta desativada. Escritas verificam novamente atividade e papel dentro da transação. Listagens de motorista e consultas por ID usam o mesmo critério de autoria. O contexto mobile compartilha apenas fatos operacionais das avarias conhecidas, sem dados de relator e sem URLs de anexos de terceiros. Novas evidências exigem sessão e permissão no download. URLs antigas permanecem intactas: as garantias de acesso do storage legado precisam de verificação na infraestrutura original antes da implantação.

## Consistência

React 19/TypeScript/Vite, Express/tRPC, Drizzle/MySQL foram preservados. `server/domain` contém completude, fotos, hodômetro, elegibilidade, dinheiro, autorização e execução transacional. `AsyncLocalStorage` faz todos os routers envolvidos compartilharem a transação do comando; auditoria também participa. Uma falha aborta as alterações relacionadas. A extração assistida existente é uma proposta sem escrita de domínio, restrita a gestor/admin e fora de transação longa. Não foi introduzida chamada de IA nova.

Transações usam READ COMMITTED e ordem de lock usuário → veículo. A tabela `activeVehicleUses` garante unicidade de veículo e condutor mesmo sob concorrência. Reservas utilizam intervalos **[início, fim)**: fim de uma reserva pode coincidir com início da seguinte. Um uso ativo bloqueia a retirada mesmo depois do fim previsto, até a devolução. Datas futuras inválidas e intervalos vazios são rejeitados.

Toda escrita do cliente adiciona `requestId` e `idempotencyKey`; comandos mobile guardam os mesmos identificadores durante todo o ciclo offline. Recibos são isolados por usuário/operação/chave e comparam o hash do conteúdo. Mesmo conteúdo retorna o resultado original; conteúdo diferente dá conflito. Chamadores antigos que omitirem a chave continuam compatíveis, mas não recebem deduplicação de criação; a integração e os fluxos mobile exigem a chave. O campo bruto `expectedRevision` compara a revisão do agregado veículo, incrementada em cada comando relacionado. O adaptador v1 exige essa revisão nas escritas delegadas. Locks e restrições também protegem comandos que não enviam revisão.

## Checklist, fotos e km

É obrigatório responder exatamente uma vez a cada item ativo do template aplicável. Um template inativo, vazio, de outro tipo de veículo, itens duplicados/estranhos e respostas fora de OK/Não OK/N/A são rejeitados. A estrutura original permite N/A; não foi criada uma política nova para negar N/A em itens específicos.

Conforme o onboarding, toda resposta Não OK exige foto. Cada Não OK abre uma ocorrência rastreável, alta para item crítico e média para triagem nos demais. Só o crítico cria restrição automática. A resposta referencia a ocorrência e a ocorrência referencia a resposta. Nada marca inspeção física automaticamente.

Fotos JPEG/PNG/WebP são verificadas pelo conteúdo, MIME e limite de 8 MiB. O servidor aceita base64 puro e data URL; gera nome seguro quando ausente. Os novos bytes e SHA-256 ficam em `evidenceFiles`, na mesma transação, com URL `/api/evidence/:id`, `no-store` e checagem de acesso. Isso permite rollback sem sucesso parcial de upload e não exige conectar storage externo nesta execução. O armazenamento de evidências deve entrar no backup, planejamento de capacidade e política de retenção. Nenhum arquivo antigo foi movido.

`recordKm` é a regra única para checklist, uso, manutenção e correção administrativa. Quilometragem inteira não negativa; atualização normal nunca diminui `currentKm`. Registros offline fora de ordem recebem conflito, sem sobrescrever o hodômetro confirmado. A leitura, origem, horário de coleta/recebimento, autoria, valor anterior e eventual correção/motivo permanecem no histórico. Correções não reescrevem leituras históricas ou distâncias já fechadas silenciosamente: eventual ajuste de uma viagem histórica requer procedimento específico posterior com rastreabilidade. O gestor pode corrigir a referência atual justificadamente e o comando pendente original pode ser revalidado com a mesma chave.

## Elegibilidade, uso e manutenção

A regra central cruza cadastro ativo, situação operacional, ocorrências altas abertas, OS impeditivas, uso ativo e sobreposição de reservas. Cadastro ativo, em uso e disponibilidade são conceitos distintos. O status de cadastro não é usado como sinônimo de veículo livre.

Uma inspeção crítica na retirada é confirmada com resultado `blocked`: checklist e ocorrência ficam registrados, sem criar uso. A retirada só fica `em_uso` após confirmação online. A devolução fecha o uso e calcula a distância; só anuncia disponibilidade calculada após reconciliar todas as restrições. Não é necessário recadastrar avarias já conhecidas.

Concluir OS não libera o veículo diante de outra restrição. Manutenção não encerra implicitamente uma ocorrência quando não tem `canCloseOccurrence`; o gestor confere o encerramento. Situações manuais têm `vehicleHolds` e motivo. A migração conserva qualquer situação anterior de manutenção como bloqueio para conferência do gestor. O desbloqueio manual exige motivo e recusa liberação se houver uso, ocorrência crítica ou OS impeditiva.

OS podem ser abertas e iniciadas segundo o fluxo legado, ou passar por envio → aprovação/rejeição → execução. Aprovadas agora também podem iniciar. Não foi imposta aprovação obrigatória de toda OS nem inventada alçada financeira; gestor/admin mantêm os poderes existentes, sem limite monetário novo. OS em aprovação/aprovada/finalizada não permite alterar orçamento. Conclusão exige execução e notas; cancelamento final não pode ser repetido como nova mudança. Itens validam decimais, quantidade positiva e total calculado, sem confiar na soma enviada pelo navegador. Aprovação não registra pagamento.

Planos são conferidos por data e km, com aplicabilidade ao veículo. Execuções no futuro, fora de ordem e incompatíveis são rejeitadas. Alertas consultam vencimento real por data ou km, sem depender somente de status armazenado. O combustível da retirada/devolução é uma leitura percentual; não foi criado controle de abastecimentos, GPS ou telemetria.

## Relatórios e auditoria

CSV/PDF mantêm os filtros da listagem e sua busca textual. A permissão é consultada no servidor antes da exportação da interface; existe também `reports.csv` com consulta autorizada para integração. CSV neutraliza fórmulas, preserva aspas/separadores e UTF-8 com BOM. CSV não é XLSX.

Auditoria deixa de ignorar falhas silenciosamente. Cada comando registra confirmação ou rejeição, usuário, operação, recurso quando conhecido, horário e requestId, sem foto, token ou conteúdo credencial. Mudanças detalhadas de domínio continuam nos registros específicos e na trilha histórica. Se o banco estiver totalmente indisponível, nenhuma escrita é confirmada; o cliente conserva o pendente. A recuperação consulta o recibo e repete a mesma chave.
