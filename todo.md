# ArqueoFrotas - TODO

## Infraestrutura e Base
- [x] Schema do banco de dados completo (todas as tabelas)
- [x] Sistema RBAC com 4 perfis (ADMIN, GESTOR_FROTA, MOTORISTA, MANUTENCAO)
- [x] Sistema de auditoria (logs imutáveis)
- [x] Middleware de proteção de rotas por perfil
- [x] Testes unitários dos routers principais

## Cadastro de Frota
- [x] CRUD de Veículos (placa, modelo, ano, tipo, status, unidade, km, etc.)
- [ ] CRUD de Documentos do veículo (CRLV, seguro, licenciamento)
- [ ] Upload de arquivos (PDF/imagem) para documentos
- [ ] Alertas automáticos de vencimento (30/15/7 dias)
- [ ] Validação de placa única
- [ ] Bloqueio de veículo por status (manutenção/baixado)

## Cadastros Auxiliares
- [ ] CRUD de Unidades
- [ ] CRUD de Projetos/Centros de Custo
- [x] CRUD de Usuários com perfis (listagem e desativação)
- [x] CRUD de Templates de Checklist

## Alocação / Reserva e Uso
- [x] Agenda de reservas (veículo, usuário, data/hora, projeto, localidade)
- [x] Validação de conflito de reservas
- [ ] Check-in (km inicial, condição, fotos)
- [ ] Check-out (km final, condição, fotos)
- [ ] Validação km_final > km_inicial
- [ ] Bloqueio de check-out sem checklist do dia

## Checklists
- [ ] Configuração de itens de checklist pelo ADMIN
- [x] Execução de checklist diário (OK/NÃO OK/N/A + comentários)
- [x] Upload de fotos para itens críticos
- [x] Geração automática de ocorrência para itens críticos NÃO OK
- [ ] Lista de checklists pendentes por usuário/veículo/unidade

## Ocorrências / Avarias
- [x] CRUD de Ocorrências (data, local, descrição, fotos, severidade, status)
- [ ] Vinculação de ocorrência a OS
- [ ] Bloqueio automático de veículo para severidade ALTA
- [ ] Histórico e evidências (anexos e comentários)

## Manutenção
- [ ] Planos preventivos por km e/ou tempo
- [ ] Alertas de manutenção (a vencer/vencida)
- [x] CRUD de Ordens de Serviço (OS) - listagem
- [ ] Atribuição de OS para equipe de manutenção
- [ ] Registro de execução (peças, serviços, anexos, datas)
- [ ] Linha do tempo do veículo

## Dashboards e Relatórios
- [x] Dashboard de disponibilidade da frota
- [x] Dashboard de checklists (pendentes, conformidade)
- [x] Dashboard de manutenção (OS abertas, SLA)
- [x] Dashboard de documentos a vencer
- [x] Dashboard de ocorrências
- [ ] Exportação CSV por módulo
- [ ] Exportação PDF de relatórios

## Interface do Usuário
- [x] Layout principal com sidebar e navegação
- [x] Tela de login/autenticação
- [x] Página inicial/Dashboard
- [x] Tela de listagem de veículos
- [x] Tela de detalhes/edição de veículo
- [x] Tela de reservas (formulário)
- [x] Tela de checklist mobile-first
- [x] Tela de ocorrências
- [x] Tela de ordens de serviço
- [x] Tela de usuários (ADMIN)
- [x] Tela de logs de auditoria (ADMIN)
- [ ] Responsividade mobile (parcial)

## Seeds e Dados de Exemplo
- [x] Seed de usuários por perfil
- [x] Seed de veículos
- [ ] Seed de reservas
- [x] Seed de checklists (templates e itens)
- [ ] Seed de ocorrências
- [ ] Seed de ordens de serviço

## Documentação
- [ ] Especificação funcional (telas e fluxos)
- [ ] Modelo de dados (tabelas/relacionamentos)
- [ ] Endpoints REST e permissões
- [ ] Wireframes textuais
- [ ] Instruções de teste e deploy

## Alterações Recentes
- [x] Remover módulo de Reservas (frontend e backend)
- [x] Atualizar paleta de cores para Grupo Arqueo (laranja, bordô, amarelo, azul)
- [x] Adicionar logo do Grupo Arqueo no sistema
- [x] Criar página de detalhes da Ocorrência
- [x] Implementar formulário de Ordem de Serviço

## Fase Final
- [x] Página de detalhes da Ordem de Serviço
- [x] CRUD de Templates de Checklist
- [x] Exportação de relatórios em CSV
- [x] Testar todas as funcionalidades
- [x] Limpar banco de dados para produção

## Correções
- [x] Corrigir cadastro de nova Ordem de Serviço
- [x] Implementar identificação única de OS no formato OS-NNNN/YYYY
- [x] Corrigir SelectItem com valor vazio em formulários

## Novas Funcionalidades
- [x] Seção de 5 fotos do status atual no cadastro de veículos
- [x] Exportação PDF com logo e identidade visual do Grupo Arqueo
- [ ] Apresentação de slides para onboarding dos colaboradores

## Funcionalidades Implementadas (Checkpoint Prestadores/Multas)
- [x] CRUD de Prestadores de Serviço (cadastro, listagem, edição, exclusão)
- [x] CRUD de Multas de Veículos (registro, listagem, edição, exclusão)
- [x] Sistema de Notificações in-app (OS pendente, aprovação, ocorrências, multas)
- [x] Cadastro de Veículos por IA (extração de dados via foto do documento)
- [x] Fluxo de Aprovação de Ordens de Serviço
- [x] CRUD completo de Usuários (criar, editar, desativar)
- [x] Correções de bugs diversos

## Deploy e Republicação
- [x] Restaurar projeto após reinicialização do webdev
- [x] Verificar banco de dados com todas as tabelas
- [x] Fazer checkpoint e deploy com credenciais renovadas
- [x] Verificar site publicado com Prestadores e Multas no menu

## IA no Cadastro de Veículos
- [x] Implementar procedure tRPC para extração de dados via IA (foto do CRLV)
- [x] Adicionar botão de upload de foto na tela de cadastro de veículos
- [x] Preenchimento automático dos campos a partir da extração da IA
- [x] Testar funcionalidade completa (4 testes passando)

## Correção: Exclusão Real de Multas (Bug Fix)
- [x] Diagnosticar causa raiz: excluir multa resulta em "Cancelada" em vez de exclusão real
- [x] Corrigir backend: mutation de exclusão deve deletar registro do banco (exclusão lógica com isDeleted)
- [x] Corrigir frontend: action de excluir deve chamar mutation correta (trpc.vehicleFines.delete)
- [x] Preservar auditoria/log da exclusão (createAuditLog com isDeleted, deletedById, deletedAt)
- [x] Garantir permissões corretas (gestorProcedure no backend + canEdit no frontend)
- [x] Corrigir filtros/listagem para não exibir multas excluídas (isDeleted=false em listAll, listByVehicle e stats)
- [x] Validar checklist completo sem regressão (26 testes passando, build OK)

## Correção: Exclusão Real de Ordens de Serviço (Bug Fix)
- [x] Diagnosticar causa raiz: excluir OS resulta em "Cancelada" em vez de exclusão real
- [x] Adicionar colunas isDeleted, deletedAt, deletedById na tabela serviceOrders
- [x] Corrigir backend: procedure delete com exclusão lógica real + auditoria
- [x] Corrigir frontend: action de excluir deve chamar mutation correta
- [x] Corrigir filtros: listAll, getById e stats excluem OS deletadas
- [x] Validar checklist completo sem regressão (26 testes passando, build OK)

## Sprint: 7 Módulos (Diagnóstico + Implementação)
- [x] M1: Exclusão real de usuários (soft delete + auditoria + permissão)
- [x] M2: Corrigir erro 404 após fazer checklist (ChecklistDetailPage criada + rota /checklists/:id)
- [x] M3: Corrigir botão de cadastro por IA (gestorProcedure → protectedProcedure)
- [x] M4: Exclusão de veículos (botão + Dialog + mutation na VehiclesPage)
- [x] M5: Edição de ocorrência (OccurrenceFormPage reescrito + rota /occurrences/:id/edit)
- [x] M6: Exclusão de ocorrência (procedure delete + botão + Dialog na OccurrencesPage)
- [x] M7: Corrigir erro ao checar checklist (resolvido com M2)
- [x] Checkup final: 26 testes passando, build OK, dev server sem erros

## Correção: Exclusão Real de Usuários
- [x] Diagnosticar: procedure de exclusão apenas desativa (active=false)
- [x] Corrigir backend: filtro WHERE active=true adicionado na query list
- [x] Corrigir frontend: já estava correto (deactivateMutation + invalidate)
- [x] Testar sem regressão (build OK, 26 testes passando)

## Sprint: Exclusão de Checklists e Ocorrências (Módulos 1 e 2)
- [ ] FASE 1: Diagnóstico completo dos dois módulos
- [ ] M1: Exclusão real de checklists (soft delete + confirmação + permissão + auditoria)
- [ ] M2: Exclusão real de ocorrências (verificar/completar o que foi feito na sprint anterior)
- [ ] Checkup final: 16 itens do checklist obrigatório
