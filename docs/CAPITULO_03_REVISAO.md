# Capítulo 03 — ArqueoFrotas

Versão 3 • 21 de outubro de 2026 • Especificação para revisão.

Atualiza a versão 2 fornecida pelo usuário. Preserva a cobertura dos onze módulos. Os agentes e skills abaixo são **futuros**: nenhum foi criado, instalado ou acionado. As regras obrigatórias estão no aplicativo e não dependem desses agentes.

## Situação e implantação

Código e fluxos determinísticos foram implementados nesta revisão; evidências e limitações estão no RELATORIO_FINAL.md. Integração externa, autenticação delegada real, dispositivos físicos, alçadas novas, telemetria e abastecimentos permanecem sujeitos à etapa futura. A decisão vigente permite acesso à frota do Grupo Arqueo, sem inferir empresa a partir de unidade.

A experiência mobile e a sincronização seguem OFFLINE.md. Operações e autorização seguem ARQUITETURA_E_REGRAS.md e INTEGRACAO_ATENA_V1.md. Não há autorização offline de retirada.

## Agentes futuros e cobertura funcional

### FRO-01 — Veículos e registro visual

- Agente: **Cadastro e integridade da frota**.
- Objetivo e módulos: atender FRO-01; ficha conferida, divergências e proposta de alteração.
- Entradas: Documento e ficha do veículo; fotos; leitura real.
- Entregas: Ficha conferida, divergências e proposta de alteração.
- Skills: `fro.cadastro@1.0.0`; compartilhadas de permissões, referências, envio idempotente e trilha. Evidências, km e offline somente quando aplicáveis.
- Ferramentas/operações permitidas: vehicles.list/getById; vehiclePhotos.listByVehicle; vehicleAI.extractFromDocument (gestor/admin), sempre no papel do originador e no escopo da concessão.
- Decisão humana: Gestor confirma cadastro, extração, baixa e correção de km.
- Limites: propor e conferir; não inventar respostas, ampliar acesso, executar pagamentos, enviar mensagens ou liberar veículo por inferência.
- Evidências e validação: IDs de origem, versão, requestId, recibo/erro e referência às evidências; confrontar entregas com estado autorizado do servidor. O agente só pode anunciar confirmação quando existir recibo compatível.

### FRO-02 — Documentos e vencimentos

- Agente: **Conformidade documental da frota**.
- Objetivo e módulos: atender FRO-02; agenda de vencimentos e referências autorizadas.
- Entradas: vehicleId, tipo, validade, arquivo e permissão.
- Entregas: Agenda de vencimentos e referências autorizadas.
- Skills: `fro.documentos@1.0.0`; compartilhadas de permissões, referências, envio idempotente e trilha. Evidências, km e offline somente quando aplicáveis.
- Ferramentas/operações permitidas: vehicleDocuments.listByVehicle/listExpiring/listExpired, sempre no papel do originador e no escopo da concessão.
- Decisão humana: Gestor valida documento e renovação; terceiros só por canal aprovado.
- Limites: propor e conferir; não inventar respostas, ampliar acesso, executar pagamentos, enviar mensagens ou liberar veículo por inferência.
- Evidências e validação: IDs de origem, versão, requestId, recibo/erro e referência às evidências; confrontar entregas com estado autorizado do servidor. O agente só pode anunciar confirmação quando existir recibo compatível.

### FRO-03 — Checklists e inspeções

- Agente: **Inspeção e evidências**.
- Objetivo e módulos: atender FRO-03; checklist rastreável e ocorrências conforme servidor.
- Entradas: Template aplicável, respostas humanas, fotos e km.
- Entregas: Checklist rastreável e ocorrências conforme servidor.
- Skills: `fro.inspecao@1.0.0`; compartilhadas de permissões, referências, envio idempotente e trilha. Evidências, km e offline somente quando aplicáveis.
- Ferramentas/operações permitidas: checklistTemplates.listActive/getById; checklists.submit/list/getById, sempre no papel do originador e no escopo da concessão.
- Decisão humana: Motorista inspeciona fisicamente; gestor resolve inconsistências.
- Limites: propor e conferir; não inventar respostas, ampliar acesso, executar pagamentos, enviar mensagens ou liberar veículo por inferência.
- Evidências e validação: IDs de origem, versão, requestId, recibo/erro e referência às evidências; confrontar entregas com estado autorizado do servidor. O agente só pode anunciar confirmação quando existir recibo compatível.

### FRO-04 — Ocorrências e tratamento

- Agente: **Triagem de ocorrências**.
- Objetivo e módulos: atender FRO-04; registro, proposta de prioridade e pendências de tratamento.
- Entradas: Relato original, veículo, severidade e fotos.
- Entregas: Registro, proposta de prioridade e pendências de tratamento.
- Skills: `fro.ocorrencias@1.0.0`; compartilhadas de permissões, referências, envio idempotente e trilha. Evidências, km e offline somente quando aplicáveis.
- Ferramentas/operações permitidas: occurrences.list/getById; reservations.reportProblem; occurrences.linkToServiceOrder/close, sempre no papel do originador e no escopo da concessão.
- Decisão humana: Gestor confirma criticidade, vínculo e encerramento.
- Limites: propor e conferir; não inventar respostas, ampliar acesso, executar pagamentos, enviar mensagens ou liberar veículo por inferência.
- Evidências e validação: IDs de origem, versão, requestId, recibo/erro e referência às evidências; confrontar entregas com estado autorizado do servidor. O agente só pode anunciar confirmação quando existir recibo compatível.

### FRO-05 — Manutenção, ordens e aprovação

- Agente: **Planejamento e acompanhamento de manutenção**.
- Objetivo e módulos: atender FRO-05; agenda, orçamento conferido, fila de aprovação e parecer de liberação.
- Entradas: Plano, km, datas, OS, itens, fornecedor e aprovação.
- Entregas: Agenda, orçamento conferido, fila de aprovação e parecer de liberação.
- Skills: `fro.manutencao@1.0.0`; compartilhadas de permissões, referências, envio idempotente e trilha. Evidências, km e offline somente quando aplicáveis.
- Ferramentas/operações permitidas: maintenancePlans._; serviceOrders._; vehicles.listAvailable, sempre no papel do originador e no escopo da concessão.
- Decisão humana: Gestor/admin aprova conforme política vigente; manutenção executa; gestor decide liberação.
- Limites: propor e conferir; não inventar respostas, ampliar acesso, executar pagamentos, enviar mensagens ou liberar veículo por inferência.
- Evidências e validação: IDs de origem, versão, requestId, recibo/erro e referência às evidências; confrontar entregas com estado autorizado do servidor. O agente só pode anunciar confirmação quando existir recibo compatível.

### FRO-06 — Multas e acompanhamento

- Agente: **Pendências de multas**.
- Objetivo e módulos: atender FRO-06; pendências e proposta de conciliação administrativa.
- Entradas: Infração, prazo, valor, condutor e comprovante.
- Entregas: Pendências e proposta de conciliação administrativa.
- Skills: `fro.multas@1.0.0`; compartilhadas de permissões, referências, envio idempotente e trilha. Evidências, km e offline somente quando aplicáveis.
- Ferramentas/operações permitidas: vehicleFines.listByVehicle/listAll/getById; atualizações de gestor, sempre no papel do originador e no escopo da concessão.
- Decisão humana: Gestor valida documento, recurso, cancelamento e situação de paga.
- Limites: propor e conferir; não inventar respostas, ampliar acesso, executar pagamentos, enviar mensagens ou liberar veículo por inferência.
- Evidências e validação: IDs de origem, versão, requestId, recibo/erro e referência às evidências; confrontar entregas com estado autorizado do servidor. O agente só pode anunciar confirmação quando existir recibo compatível.

### FRO-07 — Unidades, projetos e fornecedores

- Agente: **Vínculos operacionais**.
- Objetivo e módulos: atender FRO-07; mapa de correspondências e divergências.
- Entradas: IDs/códigos locais e centrais, empresa/unidade/projeto separados.
- Entregas: Mapa de correspondências e divergências.
- Skills: `fro.vinculos@1.0.0`; compartilhadas de permissões, referências, envio idempotente e trilha. Evidências, km e offline somente quando aplicáveis.
- Ferramentas/operações permitidas: units._, projects._, serviceProviders.\*; integration.references/mapReference, sempre no papel do originador e no escopo da concessão.
- Decisão humana: Admin decide identidade canônica e correspondências; gestor valida fornecedor.
- Limites: propor e conferir; não inventar respostas, ampliar acesso, executar pagamentos, enviar mensagens ou liberar veículo por inferência.
- Evidências e validação: IDs de origem, versão, requestId, recibo/erro e referência às evidências; confrontar entregas com estado autorizado do servidor. O agente só pode anunciar confirmação quando existir recibo compatível.

### FRO-08 — Indicadores, relatórios e custos

- Agente: **Inteligência operacional da frota**.
- Objetivo e módulos: atender FRO-08; indicadores reconciliados e relatório com limites explícitos.
- Entradas: Filtros, período, dados autorizados e data de referência.
- Entregas: Indicadores reconciliados e relatório com limites explícitos.
- Skills: `fro.relatorios@1.0.0`; compartilhadas de permissões, referências, envio idempotente e trilha. Evidências, km e offline somente quando aplicáveis.
- Ferramentas/operações permitidas: dashboard.getStats/getMotoristaStats; reports.csv, sempre no papel do originador e no escopo da concessão.
- Decisão humana: Gestor interpreta indicadores; custos de OS não são custo total da frota.
- Limites: propor e conferir; não inventar respostas, ampliar acesso, executar pagamentos, enviar mensagens ou liberar veículo por inferência.
- Evidências e validação: IDs de origem, versão, requestId, recibo/erro e referência às evidências; confrontar entregas com estado autorizado do servidor. O agente só pode anunciar confirmação quando existir recibo compatível.

### FRO-09 — Usuários, permissões e auditoria

- Agente: **Acompanhamento e auditoria**.
- Objetivo e módulos: atender FRO-09; parecer de acesso e divergências rastreáveis.
- Entradas: Solicitante, recurso, concessão delegada e trilha.
- Entregas: Parecer de acesso e divergências rastreáveis.
- Skills: `fro.auditoria@1.0.0`; compartilhadas de permissões, referências, envio idempotente e trilha. Evidências, km e offline somente quando aplicáveis.
- Ferramentas/operações permitidas: auth.me; users.profile; auditLogs.\* (admin), sempre no papel do originador e no escopo da concessão.
- Decisão humana: Somente admin concede/revoga acesso e consulta trilha completa.
- Limites: propor e conferir; não inventar respostas, ampliar acesso, executar pagamentos, enviar mensagens ou liberar veículo por inferência.
- Evidências e validação: IDs de origem, versão, requestId, recibo/erro e referência às evidências; confrontar entregas com estado autorizado do servidor. O agente só pode anunciar confirmação quando existir recibo compatível.

### FRO-10 — Notificações e integração com Atena

- Agente: **Integrações e acompanhamento**.
- Objetivo e módulos: atender FRO-10; operação rastreada, reentrega controlada e pendências.
- Entradas: Envelope v1, concessão verificada, evento/recibo e estado.
- Entregas: Operação rastreada, reentrega controlada e pendências.
- Skills: `fro.integracao@1.0.0`; compartilhadas de permissões, referências, envio idempotente e trilha. Evidências, km e offline somente quando aplicáveis.
- Ferramentas/operações permitidas: integration.operationStatus/events/acknowledgeEvent/references; adaptador v1 simulado, sempre no papel do originador e no escopo da concessão.
- Decisão humana: Responsável autoriza habilitação do conector, canal e destinatário; nenhuma conexão automática.
- Limites: propor e conferir; não inventar respostas, ampliar acesso, executar pagamentos, enviar mensagens ou liberar veículo por inferência.
- Evidências e validação: IDs de origem, versão, requestId, recibo/erro e referência às evidências; confrontar entregas com estado autorizado do servidor. O agente só pode anunciar confirmação quando existir recibo compatível.

### FRO-11 — Reservas, uso e deslocamentos

- Agente: **Disponibilidade e alocação**.
- Objetivo e módulos: atender FRO-11; reserva/uso confirmado ou conflito explicado.
- Entradas: Intervalo, condutor, projeto, inspeção, km e combustível.
- Entregas: Reserva/uso confirmado ou conflito explicado.
- Skills: `fro.uso@1.0.0`; compartilhadas de permissões, referências, envio idempotente e trilha. Evidências, km e offline somente quando aplicáveis.
- Ferramentas/operações permitidas: vehicles.listAvailable; reservations.\*; driver.context, sempre no papel do originador e no escopo da concessão.
- Decisão humana: Gestor autoriza reserva; motorista confirma inspeção; liberação depende das regras.
- Limites: propor e conferir; não inventar respostas, ampliar acesso, executar pagamentos, enviar mensagens ou liberar veículo por inferência.
- Evidências e validação: IDs de origem, versão, requestId, recibo/erro e referência às evidências; confrontar entregas com estado autorizado do servidor. O agente só pode anunciar confirmação quando existir recibo compatível.

## Skills futuras compartilhadas

Estas fichas são especificações, não pacotes instaláveis. Todas exigem usuário originador identificado, autenticação/concessão válida e dados de origem verificáveis. Execução futura depende de ferramentas autorizadas; um nome de função interna não autoriza acesso direto ao banco.

### fro.permissoes — 1.0.0

- Objetivo: Conferir identidade, papel, recurso e delegação antes de qualquer operação.
- Entradas obrigatórias: Identidade verificada; operação; recurso.
- Pré-condições: identidade e operação autorizadas; origem acessível; para escrita, chave estável e controle de concorrência aplicável.
- Procedimento: Rejeitar conta desativada ou concessão incompatível; nunca elevar papel.
- Ferramentas autorizadas: auth.me; verificador de concessão futuro; regras do servidor.
- Saídas: Decisão autorizada ou erro sem efeito.
- Validações: campos obrigatórios, acesso, integridade e compatibilidade entre origem e resultado; conferir recibo nas escritas.
- Falhas e recuperação: impedir efeito diante de validação inválida; preservar original; explicar conflito; reconsultar estado e encaminhar decisão humana; repetir somente com a mesma chave e conteúdo.
- Módulos consumidores: Todos.
- Evidência de validação futura: teste de permissão negada, caso válido, repetição e recuperação, com IDs e resultados registrados sem credenciais.

### fro.referencias — 1.0.0

- Objetivo: Conferir ID, versão e fonte canônica.
- Entradas obrigatórias: IDs locais/externos; empresa, unidade e projeto independentes.
- Pré-condições: identidade e operação autorizadas; origem acessível; para escrita, chave estável e controle de concorrência aplicável.
- Procedimento: Ler mapa; confrontar versão; preservar original; pedir decisão se houver ambiguidade.
- Ferramentas autorizadas: integration.references; consultas autorizadas.
- Saídas: Referências inequívocas ou pendências.
- Validações: campos obrigatórios, acesso, integridade e compatibilidade entre origem e resultado; conferir recibo nas escritas.
- Falhas e recuperação: impedir efeito diante de validação inválida; preservar original; explicar conflito; reconsultar estado e encaminhar decisão humana; repetir somente com a mesma chave e conteúdo.
- Módulos consumidores: Todos.
- Evidência de validação futura: teste de permissão negada, caso válido, repetição e recuperação, com IDs e resultados registrados sem credenciais.

### fro.envio-idempotente — 1.0.0

- Objetivo: Enviar um comando lógico sem duplicar efeitos.
- Entradas obrigatórias: requestId; chave estável; revisão; payload original.
- Pré-condições: identidade e operação autorizadas; origem acessível; para escrita, chave estável e controle de concorrência aplicável.
- Procedimento: Guardar envelope; enviar; consultar recibo em timeout; repetir sem modificar conteúdo.
- Ferramentas autorizadas: Procedimento tRPC autorizado; integration.operationStatus.
- Saídas: Resultado confirmado, rejeitado ou pendente.
- Validações: campos obrigatórios, acesso, integridade e compatibilidade entre origem e resultado; conferir recibo nas escritas.
- Falhas e recuperação: impedir efeito diante de validação inválida; preservar original; explicar conflito; reconsultar estado e encaminhar decisão humana; repetir somente com a mesma chave e conteúdo.
- Módulos consumidores: FRO-01 a FRO-11.
- Evidência de validação futura: teste de permissão negada, caso válido, repetição e recuperação, com IDs e resultados registrados sem credenciais.

### fro.evidencias — 1.0.0

- Objetivo: Validar e preservar evidências sem inventar conteúdo.
- Entradas obrigatórias: Arquivo original, tipo, nome e vínculo autorizado.
- Pré-condições: identidade e operação autorizadas; origem acessível; para escrita, chave estável e controle de concorrência aplicável.
- Procedimento: Conferir conteúdo/tamanho; preservar bytes/hash; encaminhar referência protegida; não apagar antes do recibo.
- Ferramentas autorizadas: Upload/consulta de evidências do aplicativo.
- Saídas: Evidência persistida ou falha explícita.
- Validações: campos obrigatórios, acesso, integridade e compatibilidade entre origem e resultado; conferir recibo nas escritas.
- Falhas e recuperação: impedir efeito diante de validação inválida; preservar original; explicar conflito; reconsultar estado e encaminhar decisão humana; repetir somente com a mesma chave e conteúdo.
- Módulos consumidores: FRO-01,02,03,04,05,06,11.
- Evidência de validação futura: teste de permissão negada, caso válido, repetição e recuperação, com IDs e resultados registrados sem credenciais.

### fro.quilometragem — 1.0.0

- Objetivo: Conciliar leituras e correções rastreáveis.
- Entradas obrigatórias: Leitura real; histórico; autoria; coleta; motivo quando correção.
- Pré-condições: identidade e operação autorizadas; origem acessível; para escrita, chave estável e controle de concorrência aplicável.
- Procedimento: Comparar leitura com referência confirmada; recusar regressão; solicitar correção humana; reenviar original após revisão.
- Ferramentas autorizadas: Serviço recordKm via comandos autorizados; vehicles.adjustKm.
- Saídas: Leitura aceita ou conflito; sem sobrescrita silenciosa.
- Validações: campos obrigatórios, acesso, integridade e compatibilidade entre origem e resultado; conferir recibo nas escritas.
- Falhas e recuperação: impedir efeito diante de validação inválida; preservar original; explicar conflito; reconsultar estado e encaminhar decisão humana; repetir somente com a mesma chave e conteúdo.
- Módulos consumidores: FRO-01,03,05,11.
- Evidência de validação futura: teste de permissão negada, caso válido, repetição e recuperação, com IDs e resultados registrados sem credenciais.

### fro.trilha — 1.0.0

- Objetivo: Conferir resultado e recuperar ação crítica.
- Entradas obrigatórias: requestId; recibo; mudanças; evento.
- Pré-condições: identidade e operação autorizadas; origem acessível; para escrita, chave estável e controle de concorrência aplicável.
- Procedimento: Verificar confirmação transacional; consultar trilha conforme papel; manter erro/resultados sem credenciais.
- Ferramentas autorizadas: integration.operationStatus; auditLogs.\* (admin).
- Saídas: Evidência de execução ou pendência de recuperação.
- Validações: campos obrigatórios, acesso, integridade e compatibilidade entre origem e resultado; conferir recibo nas escritas.
- Falhas e recuperação: impedir efeito diante de validação inválida; preservar original; explicar conflito; reconsultar estado e encaminhar decisão humana; repetir somente com a mesma chave e conteúdo.
- Módulos consumidores: Todos.
- Evidência de validação futura: teste de permissão negada, caso válido, repetição e recuperação, com IDs e resultados registrados sem credenciais.

### fro.formulario-contextual — 1.0.0

- Objetivo: Preparar campos mínimos sem responder pela pessoa.
- Entradas obrigatórias: Identidade, uso/reserva, veículo, template e avarias conhecidas.
- Pré-condições: identidade e operação autorizadas; origem acessível; para escrita, chave estável e controle de concorrência aplicável.
- Procedimento: Recuperar contexto; ocultar repetição; exibir perguntas condicionais; solicitar inspeção física.
- Ferramentas autorizadas: driver.context; templates; formulário mobile.
- Saídas: Rascunho contextual com campos humanos em branco.
- Validações: campos obrigatórios, acesso, integridade e compatibilidade entre origem e resultado; conferir recibo nas escritas.
- Falhas e recuperação: impedir efeito diante de validação inválida; preservar original; explicar conflito; reconsultar estado e encaminhar decisão humana; repetir somente com a mesma chave e conteúdo.
- Módulos consumidores: FRO-03,04,11.
- Evidência de validação futura: teste de permissão negada, caso válido, repetição e recuperação, com IDs e resultados registrados sem credenciais.

### fro.recuperacao-offline — 1.0.0

- Objetivo: Preservar e revalidar fila após interrupção.
- Entradas obrigatórias: Rascunho criptografado por usuário; comando; fotos; sessão.
- Pré-condições: identidade e operação autorizadas; origem acessível; para escrita, chave estável e controle de concorrência aplicável.
- Procedimento: Recuperar IndexedDB; conferir mesma conta; manter estados; enviar explicitamente online; conservar evidências até confirmação.
- Ferramentas autorizadas: Fila local; auth.me; comandos e recibos.
- Saídas: Confirmado, pendente ou conflito legível.
- Validações: campos obrigatórios, acesso, integridade e compatibilidade entre origem e resultado; conferir recibo nas escritas.
- Falhas e recuperação: impedir efeito diante de validação inválida; preservar original; explicar conflito; reconsultar estado e encaminhar decisão humana; repetir somente com a mesma chave e conteúdo.
- Módulos consumidores: FRO-03,04,10,11.
- Evidência de validação futura: teste de permissão negada, caso válido, repetição e recuperação, com IDs e resultados registrados sem credenciais.

### fro.conciliacao-conflitos — 1.0.0

- Objetivo: Encaminhar conflito ao responsável sem inventar solução.
- Entradas obrigatórias: Registro original; motivo; estado atual; responsável.
- Pré-condições: identidade e operação autorizadas; origem acessível; para escrita, chave estável e controle de concorrência aplicável.
- Procedimento: Preservar original; explicar divergência; solicitar decisão justificada; revalidar mesma chave após correção; nunca autorizar retirada offline.
- Ferramentas autorizadas: Consulta de domínio; correção autorizada; recibos.
- Saídas: Decisão humana rastreável e revalidação.
- Validações: campos obrigatórios, acesso, integridade e compatibilidade entre origem e resultado; conferir recibo nas escritas.
- Falhas e recuperação: impedir efeito diante de validação inválida; preservar original; explicar conflito; reconsultar estado e encaminhar decisão humana; repetir somente com a mesma chave e conteúdo.
- Módulos consumidores: FRO-01,03,04,05,10,11.
- Evidência de validação futura: teste de permissão negada, caso válido, repetição e recuperação, com IDs e resultados registrados sem credenciais.

## Skills específicas por módulo

### fro.cadastro — 1.0.0

- Objetivo: executar a conferência e preparação de FRO-01 (Veículos e registro visual).
- Entradas obrigatórias: Documento e ficha do veículo; fotos; leitura real.
- Pré-condições: skill compartilhada de permissões aprovada; dados/referências acessíveis; decisão humana quando necessária: Gestor confirma cadastro, extração, baixa e correção de km.
- Procedimento: Conferir campos extraídos sem gravar; confrontar placa/chassi; verificar cobertura das cinco fotos; encaminhar correção justificada.
- Procedimentos comuns: reutilizar `fro.permissoes`, `fro.referencias`, `fro.envio-idempotente` e `fro.trilha`. Para fotos/km, chamar as skills compartilhadas correspondentes; para mobile, `fro.formulario-contextual`, `fro.recuperacao-offline` e `fro.conciliacao-conflitos`.
- Ferramentas autorizadas: vehicles.list/getById; vehiclePhotos.listByVehicle; vehicleAI.extractFromDocument (gestor/admin); nenhuma escrita direta em banco ou uso de sessão genérica de administrador.
- Saídas: Ficha conferida, divergências e proposta de alteração; identificar confirmado, pendente, rejeitado ou apenas proposto.
- Validações: verificar IDs, versão, permissão, consistência dos vínculos e resultado das regras do aplicativo; exigir prova humana onde o fato é físico.
- Falhas e recuperação: preservar fontes e evidências; não fabricar valores; explicar falha; recuperar recibo e encaminhar conflito; repetir comando sem mudar a chave ou o conteúdo.
- Módulos consumidores: FRO-01; agente Cadastro e integridade da frota.
- Evidência e critério de aceite: caso autorizado e negado, teste de domínio aplicável, duplicidade sem efeito adicional e recuperação de falha; aceite humano do módulo antes de habilitar automação.

### fro.documentos — 1.0.0

- Objetivo: executar a conferência e preparação de FRO-02 (Documentos e vencimentos).
- Entradas obrigatórias: vehicleId, tipo, validade, arquivo e permissão.
- Pré-condições: skill compartilhada de permissões aprovada; dados/referências acessíveis; decisão humana quando necessária: Gestor valida documento e renovação; terceiros só por canal aprovado.
- Procedimento: Conferir datas e arquivo; identificar versões e prazo; apresentar pendências e referência sem copiar arquivo para destino não autorizado.
- Procedimentos comuns: reutilizar `fro.permissoes`, `fro.referencias`, `fro.envio-idempotente` e `fro.trilha`. Para fotos/km, chamar as skills compartilhadas correspondentes; para mobile, `fro.formulario-contextual`, `fro.recuperacao-offline` e `fro.conciliacao-conflitos`.
- Ferramentas autorizadas: vehicleDocuments.listByVehicle/listExpiring/listExpired; nenhuma escrita direta em banco ou uso de sessão genérica de administrador.
- Saídas: Agenda de vencimentos e referências autorizadas; identificar confirmado, pendente, rejeitado ou apenas proposto.
- Validações: verificar IDs, versão, permissão, consistência dos vínculos e resultado das regras do aplicativo; exigir prova humana onde o fato é físico.
- Falhas e recuperação: preservar fontes e evidências; não fabricar valores; explicar falha; recuperar recibo e encaminhar conflito; repetir comando sem mudar a chave ou o conteúdo.
- Módulos consumidores: FRO-02; agente Conformidade documental da frota.
- Evidência e critério de aceite: caso autorizado e negado, teste de domínio aplicável, duplicidade sem efeito adicional e recuperação de falha; aceite humano do módulo antes de habilitar automação.

### fro.inspecao — 1.0.0

- Objetivo: executar a conferência e preparação de FRO-03 (Checklists e inspeções).
- Entradas obrigatórias: Template aplicável, respostas humanas, fotos e km.
- Pré-condições: skill compartilhada de permissões aprovada; dados/referências acessíveis; decisão humana quando necessária: Motorista inspeciona fisicamente; gestor resolve inconsistências.
- Procedimento: Carregar template; conferir completude; solicitar evidência de Não OK; encaminhar respostas reais; consultar recibo; não inferir inspeção.
- Procedimentos comuns: reutilizar `fro.permissoes`, `fro.referencias`, `fro.envio-idempotente` e `fro.trilha`. Para fotos/km, chamar as skills compartilhadas correspondentes; para mobile, `fro.formulario-contextual`, `fro.recuperacao-offline` e `fro.conciliacao-conflitos`.
- Ferramentas autorizadas: checklistTemplates.listActive/getById; checklists.submit/list/getById; nenhuma escrita direta em banco ou uso de sessão genérica de administrador.
- Saídas: Checklist rastreável e ocorrências conforme servidor; identificar confirmado, pendente, rejeitado ou apenas proposto.
- Validações: verificar IDs, versão, permissão, consistência dos vínculos e resultado das regras do aplicativo; exigir prova humana onde o fato é físico.
- Falhas e recuperação: preservar fontes e evidências; não fabricar valores; explicar falha; recuperar recibo e encaminhar conflito; repetir comando sem mudar a chave ou o conteúdo.
- Módulos consumidores: FRO-03; agente Inspeção e evidências.
- Evidência e critério de aceite: caso autorizado e negado, teste de domínio aplicável, duplicidade sem efeito adicional e recuperação de falha; aceite humano do módulo antes de habilitar automação.

### fro.ocorrencias — 1.0.0

- Objetivo: executar a conferência e preparação de FRO-04 (Ocorrências e tratamento).
- Entradas obrigatórias: Relato original, veículo, severidade e fotos.
- Pré-condições: skill compartilhada de permissões aprovada; dados/referências acessíveis; decisão humana quando necessária: Gestor confirma criticidade, vínculo e encerramento.
- Procedimento: Preservar relato; verificar avarias conhecidas; propor classificação sem substituir regra; conferir vínculo com OS do mesmo veículo; acompanhar encerramento.
- Procedimentos comuns: reutilizar `fro.permissoes`, `fro.referencias`, `fro.envio-idempotente` e `fro.trilha`. Para fotos/km, chamar as skills compartilhadas correspondentes; para mobile, `fro.formulario-contextual`, `fro.recuperacao-offline` e `fro.conciliacao-conflitos`.
- Ferramentas autorizadas: occurrences.list/getById; reservations.reportProblem; occurrences.linkToServiceOrder/close; nenhuma escrita direta em banco ou uso de sessão genérica de administrador.
- Saídas: Registro, proposta de prioridade e pendências de tratamento; identificar confirmado, pendente, rejeitado ou apenas proposto.
- Validações: verificar IDs, versão, permissão, consistência dos vínculos e resultado das regras do aplicativo; exigir prova humana onde o fato é físico.
- Falhas e recuperação: preservar fontes e evidências; não fabricar valores; explicar falha; recuperar recibo e encaminhar conflito; repetir comando sem mudar a chave ou o conteúdo.
- Módulos consumidores: FRO-04; agente Triagem de ocorrências.
- Evidência e critério de aceite: caso autorizado e negado, teste de domínio aplicável, duplicidade sem efeito adicional e recuperação de falha; aceite humano do módulo antes de habilitar automação.

### fro.manutencao — 1.0.0

- Objetivo: executar a conferência e preparação de FRO-05 (Manutenção, ordens e aprovação).
- Entradas obrigatórias: Plano, km, datas, OS, itens, fornecedor e aprovação.
- Pré-condições: skill compartilhada de permissões aprovada; dados/referências acessíveis; decisão humana quando necessária: Gestor/admin aprova conforme política vigente; manutenção executa; gestor decide liberação.
- Procedimento: Calcular vencimento por data/km; conferir quantidade e preço; enviar para aprovação quando aplicável; acompanhar execução; consultar todas as restrições antes de propor liberação.
- Procedimentos comuns: reutilizar `fro.permissoes`, `fro.referencias`, `fro.envio-idempotente` e `fro.trilha`. Para fotos/km, chamar as skills compartilhadas correspondentes; para mobile, `fro.formulario-contextual`, `fro.recuperacao-offline` e `fro.conciliacao-conflitos`.
- Ferramentas autorizadas: maintenancePlans._; serviceOrders._; vehicles.listAvailable; nenhuma escrita direta em banco ou uso de sessão genérica de administrador.
- Saídas: Agenda, orçamento conferido, fila de aprovação e parecer de liberação; identificar confirmado, pendente, rejeitado ou apenas proposto.
- Validações: verificar IDs, versão, permissão, consistência dos vínculos e resultado das regras do aplicativo; exigir prova humana onde o fato é físico.
- Falhas e recuperação: preservar fontes e evidências; não fabricar valores; explicar falha; recuperar recibo e encaminhar conflito; repetir comando sem mudar a chave ou o conteúdo.
- Módulos consumidores: FRO-05; agente Planejamento e acompanhamento de manutenção.
- Evidência e critério de aceite: caso autorizado e negado, teste de domínio aplicável, duplicidade sem efeito adicional e recuperação de falha; aceite humano do módulo antes de habilitar automação.

### fro.multas — 1.0.0

- Objetivo: executar a conferência e preparação de FRO-06 (Multas e acompanhamento).
- Entradas obrigatórias: Infração, prazo, valor, condutor e comprovante.
- Pré-condições: skill compartilhada de permissões aprovada; dados/referências acessíveis; decisão humana quando necessária: Gestor valida documento, recurso, cancelamento e situação de paga.
- Procedimento: Confrontar documento e dados; conferir prazo e vínculo; propor status com evidência; não executar ou presumir pagamento.
- Procedimentos comuns: reutilizar `fro.permissoes`, `fro.referencias`, `fro.envio-idempotente` e `fro.trilha`. Para fotos/km, chamar as skills compartilhadas correspondentes; para mobile, `fro.formulario-contextual`, `fro.recuperacao-offline` e `fro.conciliacao-conflitos`.
- Ferramentas autorizadas: vehicleFines.listByVehicle/listAll/getById; atualizações de gestor; nenhuma escrita direta em banco ou uso de sessão genérica de administrador.
- Saídas: Pendências e proposta de conciliação administrativa; identificar confirmado, pendente, rejeitado ou apenas proposto.
- Validações: verificar IDs, versão, permissão, consistência dos vínculos e resultado das regras do aplicativo; exigir prova humana onde o fato é físico.
- Falhas e recuperação: preservar fontes e evidências; não fabricar valores; explicar falha; recuperar recibo e encaminhar conflito; repetir comando sem mudar a chave ou o conteúdo.
- Módulos consumidores: FRO-06; agente Pendências de multas.
- Evidência e critério de aceite: caso autorizado e negado, teste de domínio aplicável, duplicidade sem efeito adicional e recuperação de falha; aceite humano do módulo antes de habilitar automação.

### fro.vinculos — 1.0.0

- Objetivo: executar a conferência e preparação de FRO-07 (Unidades, projetos e fornecedores).
- Entradas obrigatórias: IDs/códigos locais e centrais, empresa/unidade/projeto separados.
- Pré-condições: skill compartilhada de permissões aprovada; dados/referências acessíveis; decisão humana quando necessária: Admin decide identidade canônica e correspondências; gestor valida fornecedor.
- Procedimento: Comparar códigos e fonte canônica; verificar duplicidades; preservar IDs locais; mapear somente após revisão; não inferir empresa de unidade.
- Procedimentos comuns: reutilizar `fro.permissoes`, `fro.referencias`, `fro.envio-idempotente` e `fro.trilha`. Para fotos/km, chamar as skills compartilhadas correspondentes; para mobile, `fro.formulario-contextual`, `fro.recuperacao-offline` e `fro.conciliacao-conflitos`.
- Ferramentas autorizadas: units._, projects._, serviceProviders.\*; integration.references/mapReference; nenhuma escrita direta em banco ou uso de sessão genérica de administrador.
- Saídas: Mapa de correspondências e divergências; identificar confirmado, pendente, rejeitado ou apenas proposto.
- Validações: verificar IDs, versão, permissão, consistência dos vínculos e resultado das regras do aplicativo; exigir prova humana onde o fato é físico.
- Falhas e recuperação: preservar fontes e evidências; não fabricar valores; explicar falha; recuperar recibo e encaminhar conflito; repetir comando sem mudar a chave ou o conteúdo.
- Módulos consumidores: FRO-07; agente Vínculos operacionais.
- Evidência e critério de aceite: caso autorizado e negado, teste de domínio aplicável, duplicidade sem efeito adicional e recuperação de falha; aceite humano do módulo antes de habilitar automação.

### fro.relatorios — 1.0.0

- Objetivo: executar a conferência e preparação de FRO-08 (Indicadores, relatórios e custos).
- Entradas obrigatórias: Filtros, período, dados autorizados e data de referência.
- Pré-condições: skill compartilhada de permissões aprovada; dados/referências acessíveis; decisão humana quando necessária: Gestor interpreta indicadores; custos de OS não são custo total da frota.
- Procedimento: Reaplicar filtros; conferir totais com registros; gerar relatório autorizado; identificar CSV/PDF corretamente e explicitar cobertura dos custos.
- Procedimentos comuns: reutilizar `fro.permissoes`, `fro.referencias`, `fro.envio-idempotente` e `fro.trilha`. Para fotos/km, chamar as skills compartilhadas correspondentes; para mobile, `fro.formulario-contextual`, `fro.recuperacao-offline` e `fro.conciliacao-conflitos`.
- Ferramentas autorizadas: dashboard.getStats/getMotoristaStats; reports.csv; nenhuma escrita direta em banco ou uso de sessão genérica de administrador.
- Saídas: Indicadores reconciliados e relatório com limites explícitos; identificar confirmado, pendente, rejeitado ou apenas proposto.
- Validações: verificar IDs, versão, permissão, consistência dos vínculos e resultado das regras do aplicativo; exigir prova humana onde o fato é físico.
- Falhas e recuperação: preservar fontes e evidências; não fabricar valores; explicar falha; recuperar recibo e encaminhar conflito; repetir comando sem mudar a chave ou o conteúdo.
- Módulos consumidores: FRO-08; agente Inteligência operacional da frota.
- Evidência e critério de aceite: caso autorizado e negado, teste de domínio aplicável, duplicidade sem efeito adicional e recuperação de falha; aceite humano do módulo antes de habilitar automação.

### fro.auditoria — 1.0.0

- Objetivo: executar a conferência e preparação de FRO-09 (Usuários, permissões e auditoria).
- Entradas obrigatórias: Solicitante, recurso, concessão delegada e trilha.
- Pré-condições: skill compartilhada de permissões aprovada; dados/referências acessíveis; decisão humana quando necessária: Somente admin concede/revoga acesso e consulta trilha completa.
- Procedimento: Conferir atividade/papel e origem verificada; consultar registro mínimo necessário; confrontar autor/recurso/mudança/resultado; não conceder privilégio por inferência.
- Procedimentos comuns: reutilizar `fro.permissoes`, `fro.referencias`, `fro.envio-idempotente` e `fro.trilha`. Para fotos/km, chamar as skills compartilhadas correspondentes; para mobile, `fro.formulario-contextual`, `fro.recuperacao-offline` e `fro.conciliacao-conflitos`.
- Ferramentas autorizadas: auth.me; users.profile; auditLogs.\* (admin); nenhuma escrita direta em banco ou uso de sessão genérica de administrador.
- Saídas: Parecer de acesso e divergências rastreáveis; identificar confirmado, pendente, rejeitado ou apenas proposto.
- Validações: verificar IDs, versão, permissão, consistência dos vínculos e resultado das regras do aplicativo; exigir prova humana onde o fato é físico.
- Falhas e recuperação: preservar fontes e evidências; não fabricar valores; explicar falha; recuperar recibo e encaminhar conflito; repetir comando sem mudar a chave ou o conteúdo.
- Módulos consumidores: FRO-09; agente Acompanhamento e auditoria.
- Evidência e critério de aceite: caso autorizado e negado, teste de domínio aplicável, duplicidade sem efeito adicional e recuperação de falha; aceite humano do módulo antes de habilitar automação.

### fro.integracao — 1.0.0

- Objetivo: executar a conferência e preparação de FRO-10 (Notificações e integração com Atena).
- Entradas obrigatórias: Envelope v1, concessão verificada, evento/recibo e estado.
- Pré-condições: skill compartilhada de permissões aprovada; dados/referências acessíveis; decisão humana quando necessária: Responsável autoriza habilitação do conector, canal e destinatário; nenhuma conexão automática.
- Procedimento: Validar envelope/escopo; encaminhar comando idempotente; recuperar recibo após timeout; deduplicar eventos; reconhecer apenas após persistir efeito; não enviar mensagens nesta fase.
- Procedimentos comuns: reutilizar `fro.permissoes`, `fro.referencias`, `fro.envio-idempotente` e `fro.trilha`. Para fotos/km, chamar as skills compartilhadas correspondentes; para mobile, `fro.formulario-contextual`, `fro.recuperacao-offline` e `fro.conciliacao-conflitos`.
- Ferramentas autorizadas: integration.operationStatus/events/acknowledgeEvent/references; adaptador v1 simulado; nenhuma escrita direta em banco ou uso de sessão genérica de administrador.
- Saídas: Operação rastreada, reentrega controlada e pendências; identificar confirmado, pendente, rejeitado ou apenas proposto.
- Validações: verificar IDs, versão, permissão, consistência dos vínculos e resultado das regras do aplicativo; exigir prova humana onde o fato é físico.
- Falhas e recuperação: preservar fontes e evidências; não fabricar valores; explicar falha; recuperar recibo e encaminhar conflito; repetir comando sem mudar a chave ou o conteúdo.
- Módulos consumidores: FRO-10; agente Integrações e acompanhamento.
- Evidência e critério de aceite: caso autorizado e negado, teste de domínio aplicável, duplicidade sem efeito adicional e recuperação de falha; aceite humano do módulo antes de habilitar automação.

### fro.uso — 1.0.0

- Objetivo: executar a conferência e preparação de FRO-11 (Reservas, uso e deslocamentos).
- Entradas obrigatórias: Intervalo, condutor, projeto, inspeção, km e combustível.
- Pré-condições: skill compartilhada de permissões aprovada; dados/referências acessíveis; decisão humana quando necessária: Gestor autoriza reserva; motorista confirma inspeção; liberação depende das regras.
- Procedimento: Consultar intervalo e restrições; preparar formulário contextual; registrar retirada online; capturar devolução offline como pendente; reconciliar pela mesma chave sem sobrescrever conflitos.
- Procedimentos comuns: reutilizar `fro.permissoes`, `fro.referencias`, `fro.envio-idempotente` e `fro.trilha`. Para fotos/km, chamar as skills compartilhadas correspondentes; para mobile, `fro.formulario-contextual`, `fro.recuperacao-offline` e `fro.conciliacao-conflitos`.
- Ferramentas autorizadas: vehicles.listAvailable; reservations.\*; driver.context; nenhuma escrita direta em banco ou uso de sessão genérica de administrador.
- Saídas: Reserva/uso confirmado ou conflito explicado; identificar confirmado, pendente, rejeitado ou apenas proposto.
- Validações: verificar IDs, versão, permissão, consistência dos vínculos e resultado das regras do aplicativo; exigir prova humana onde o fato é físico.
- Falhas e recuperação: preservar fontes e evidências; não fabricar valores; explicar falha; recuperar recibo e encaminhar conflito; repetir comando sem mudar a chave ou o conteúdo.
- Módulos consumidores: FRO-11; agente Disponibilidade e alocação.
- Evidência e critério de aceite: caso autorizado e negado, teste de domínio aplicável, duplicidade sem efeito adicional e recuperação de falha; aceite humano do módulo antes de habilitar automação.

## Reuso e decisões pendentes

Os nomes de conferência cadastral, extração assistida, conferência visual, completude, evidências, triagem, orçamento, planejamento preventivo, relatório, identidade e alocação da versão 2 foram consolidados nas fichas de módulo e procedimentos compartilhados acima. Isso preserva o alcance sem criar cópias de autorização, deduplicação, km ou auditoria.

Exigem decisão/validação futura: limites financeiros e eventual separação solicitante/aprovador; fonte canônica de empresas/projetos/fornecedores; concessão delegada e transporte autenticado; canal/destinatário para avisos; retenção corporativa/dispositivos; contingência operacional de retirada; telemetria/GPS; combustível/abastecimento. As políticas não foram inventadas.

A habilitação da Atena começa com consultas e contrato bilateral, seguida de comandos selecionados com escopos explícitos e aceite. Aprovação de OS não é pagamento. A liberação depende das regras determinísticas do aplicativo.
