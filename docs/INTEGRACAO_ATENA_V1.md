# Contrato ArqueoFrotas / Atena OS v1.0.0

**Preparado e testado com executor simulado. Não conectado à Atena OS.** Não há credencial, agente, skill instalada, webhook externo, envio de mensagens, pagamento ou sincronização externa nesta entrega.

## Transporte e identidade

O aplicativo conserva `/api/trpc` e o transformador SuperJSON. Sessão humana OAuth/cookie continua funcionando; conta e papel atuais são conferidos no servidor. Um adaptador futuro deverá verificar assinatura, expiração, audiência, revogação e vínculo de uma concessão delegada antes de usar `invokeDelegated` em `shared/integration-contract.ts`. Essa função recebe identidade **já verificada** e não implementa autenticação de serviço. Ela não está publicada como endpoint de confiança aberto.

Nunca utilizar uma sessão compartilhada de administrador. O executor deverá estabelecer o usuário humano originador no contexto, conferir escopo e recurso e então chamar o procedimento de domínio/tRPC. O grupo autorizado nesta instalação é `grupo-arqueo`, por decisão do usuário. `companyId`, `unitId` e `projectId` são referências independentes; desconhecido permanece nulo e não é inferido.

Envelope de referência:

```json
{
  "version": "1.0.0",
  "requestId": "UUID",
  "idempotencyKey": "UUID estável",
  "originator": {
    "userId": 42,
    "groupId": "grupo-arqueo",
    "companyId": null,
    "unitId": 3
  },
  "delegation": {
    "service": "atena-os",
    "grantId": "concessao-verificada",
    "scopes": ["reservations.return"]
  },
  "operation": "reservations.return",
  "vehicleId": 10,
  "expectedRevision": 7,
  "parameters": {}
}
```

O executor recebe a revisão, requestId e chave e os passa ao comando junto aos parâmetros; a origem nunca vem de um `userId` livre no formulário de motorista. Writes delegadas exigem `vehicleId` e `expectedRevision`; o servidor compara revisão sob lock. O executor deve mapear resultado `blocked` como inspeção recebida sem retirada autorizada.

## Operações disponíveis no aplicativo

Os schemas TypeScript/Zod são a fonte exata dos campos. Datas via SuperJSON; fotos base64 puro ou data URL JPEG/PNG/WebP, até 8 MiB.

| Operação                              | Entrada principal                                                                              | Resposta / permissão                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `driver.context`                      | Sessão                                                                                         | Veículos, templates/itens ativos, projetos, reservas próprias, avarias operacionais; autenticado   |
| `vehicles.list/getById`               | Filtros ou id                                                                                  | Ficha, km, situação, revisão; autenticado                                                          |
| `vehicles.listAvailable`              | startDate, endDate, unitId opcional                                                            | Disponíveis no intervalo; autenticado                                                              |
| `checklists.submit`                   | vehicleId, templateId, respostas completas, km/coleta opcionais                                | id, hasIssues, critical; autenticado, autoria da sessão                                            |
| `reservations.mine`                   | Sessão                                                                                         | Reservas/usos do originador                                                                        |
| `reservations.list/create`            | Na criação: veículo, usuário, projeto, intervalo, finalidade opcional, metadados               | Reserva agendada; gestor/admin                                                                     |
| `reservations.cancel`                 | id, reason, metadados                                                                          | Cancelada; própria agendada ou gestor/admin                                                        |
| `reservations.pickup`                 | vehicleId, reservationId/projectId quando aplicáveis, endDate, km, fuel, inspection, metadados | Uso em_uso com id/horário ou blocked com checklistId; autenticado, próprio condutor                |
| `reservations.return`                 | id, km, fuel, collectedAt, inspection, problem opcional, metadados                             | concluida, distanceKm, available, reasons, receivedAt; condutor do uso                             |
| `reservations.reportProblem`          | vehicleId, collectedAt, description, severity, foto opcional, metadados                        | Ocorrência aberta, id/receivedAt; autenticado                                                      |
| `vehicles.adjustKm`                   | id, newKm, reason, metadados                                                                   | Correção com histórico; gestor/admin                                                               |
| `serviceOrders.*`                     | Schemas dos procedimentos                                                                      | Criar/aprovar/rejeitar/cancelar: gestor/admin; executar: gestor/admin ou manutenção atribuída      |
| `reports.authorize/csv`               | No CSV: entity e filtros tipados                                                               | Arquivo com filtros/data/rowCount; gestor/admin                                                    |
| `integration.operationStatus`         | operation, idempotencyKey                                                                      | confirmed com resultado SuperJSON, rejected com erro resumido ou not_confirmed; somente originador |
| `integration.events`                  | consumer, limit                                                                                | Eventos ainda não reconhecidos pelo usuário/consumidor; gestor/admin                               |
| `integration.acknowledgeEvent`        | consumer, eventId, metadados                                                                   | Reconhecimento idempotente; gestor/admin                                                           |
| `integration.references/mapReference` | Sistema e correspondências                                                                     | Consulta gestor/admin; cadastro admin                                                              |

Exemplo de `inspection`: `{templateId, responses:[{templateItemId,response,comment?,photoData?,photoFileName?}]}`. Não há respostas preenchidas por IA. `fuel` é inteiro de 0 a 100, apenas estado do tanque. `problem` usa descrição, severidade e foto opcionais. Uma nova retirada não recebe horário passado para efetivação: o servidor usa o momento online da confirmação.

## Concorrência, repetição e recuperação

`requestId` identifica a tentativa; `idempotencyKey` identifica o comando lógico. Repetir o comando com a mesma chave preserva o resultado, inclusive após perda de resposta. Alterar conteúdo com a mesma chave gera CONFLICT. Recibos pertencem ao usuário e procedimento. O hash compara o conteúdo de negócio sem requestId; não se deve trocar collectedAt ou qualquer campo em um retry.

Revisão do veículo é um inteiro separado de updatedAt para evitar ambiguidade de precisão de timestamps. O campo `expectedRevision` no input bruto das escritas é conferido no middleware antes do efeito. Consultar novamente ao receber conflito, preservar o original e solicitar decisão humana quando necessário. Erros BAD_REQUEST (dados/completude), UNAUTHORIZED (sessão/revogação), FORBIDDEN (papel/escopo), NOT_FOUND (recurso indisponível), CONFLICT (agenda/km/revisão/chave) e INTERNAL_SERVER_ERROR não são sucesso.

Não há operação longa conectada externamente. A consulta de recibo recupera comandos atuais. Para jobs futuros: adicionar jobId, queued/running/confirmed/rejected, cancelamento autorizado e persistência antes de anunciar fila; este protocolo assíncrono continua planejado.

## Eventos e referências

A transação escreve evento imutável com id UUID, versão de payload, originador, requestId, operação, recurso e horário. O payload é mínimo; consumidores consultam o estado autorizado para detalhes. O evento corresponde ao procedimento, por exemplo `checklists.submit`, `reservations.return`, `serviceOrders.approve` ou `serviceOrders.complete`.

Não existe despachante externo habilitado. A consulta retorna eventos pendentes até reconhecimento explícito por par usuário/consumer. A ausência de cursor temporal exclusivo evita perder eventos com mesmo segundo ou commit tardio. O consumidor deve deduplicar por eventId, confirmar somente depois de persistir seu efeito, tolerar reentrega e manter reconciliação. Reconhecimentos não geram eventos recursivos. Falha de canal não elimina evento, pois nada é removido antes do ack. Monitoramento, assinatura de transporte e política de retenção dos eventos aguardam a conexão real.

`integrationReferences` conserva correspondências únicas nos dois sentidos por sistema/tipo. Sistemas previstos: `portfolios-projetos`, `fornecedores`, `financeiro`, `ativos`, `repositorio-central`. Guardar ID local, ID externo e versão; recusar substituição silenciosa de correspondência. O aplicativo mantém os dados de inspeção, uso, ocorrência, veículo e manutenção como originais locais. Fornecedores/projetos centrais exigem acordo de fonte canônica antes de sincronização.

Arquivos antigos conservam URL/chave original. Novos arquivos têm referência interna protegida e hash. Originais/versões devem ser referenciados, sem substituir bytes anteriores. Uma migração de repositório exige inventário, mapa de correspondências, verificação de hash, permissão, backup e recuperação testada. Não foi executada migração de arquivos.

Aprovação de OS é autorização de fluxo/custo; não comprova pagamento. Nenhum endpoint desta camada executa pagamento ou envia mensagem a terceiro.

## Validação e limites

Testes de contrato simulam identidade verificada/executor e recusam personificação, escopos excessivos e falta de revisão. Testes reais no banco local cobrem recibos, conflitos e reconhecimento de eventos. Ainda são necessários teste bilateral com a Atena, autenticação delegada real, correspondência de cadastros e aceite dos responsáveis antes de habilitar transporte externo.
