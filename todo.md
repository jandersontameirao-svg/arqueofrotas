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
- [ ] CRUD de Templates de Checklist

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
