# ArqueoFrotas — onboarding atualizado

Revisão de 21/10/2026. Material para revisão e homologação. A instalação em produção e a conexão com Atena OS não foram realizadas.

## Acesso e perfis

Entre com sua conta corporativa pelo fluxo OAuth configurado. Administrador administra usuários, templates e permissões; gestor acompanha a frota e decide liberações; manutenção executa OS atribuídas; motorista realiza inspeções e registra uso e problemas. A frota do Grupo Arqueo é compartilhada conforme decisão aprovada; os registros pessoais e as operações mantêm suas restrições. Uma conta desativada perde acesso mesmo com sessão existente.

O material anterior informava sessão de 30 dias. O código usa duração configurada no backend, com padrão de um ano para o cookie/token. Não contar com um prazo fixo de 30 dias; encerramento, expiração ou desativação podem exigir novo login. Contatos de suporte do material anterior não foram reconfirmados; use o responsável interno pela frota.

## No celular

O motorista entra em `/driver` ou na página inicial e encontra três ações: **Retirar veículo**, **Devolver veículo** e **Informar problema**. O app pode ser adicionado à tela inicial quando o navegador permitir. Aguarde o primeiro carregamento online para preparar os dados do aparelho. A instalação/câmera em aparelhos Android e iPhone físicos ainda precisa de homologação.

## Retirar veículo

1. Escolha o veículo ou sua reserva. Confira identificação, última leitura e problemas já conhecidos. Não cadastre novamente uma avaria já registrada.
2. Confirme o projeto quando aplicável e informe a previsão de devolução. A identidade do condutor vem da sessão.
3. Leia o hodômetro e informe o combustível de 0 a 100%. A última leitura exibida é referência, não substitui a leitura física.
4. Inspecione cada item do template. Marque OK, Não OK ou N/A conforme a situação real. Não há respostas automáticas. Toda resposta Não OK exige foto no mesmo percurso.
5. Toque **Enviar para confirmação**. Só retire após o servidor confirmar o uso. Se a inspeção apontar item crítico, ela será registrada com bloqueio e a retirada não será autorizada.

O servidor recusa uso simultâneo, reserva conflitante, veículo restrito e leitura inconsistente. Cadastro “ativo” não significa disponível em qualquer data. O horário efetivo da retirada é confirmado online.

## Devolver veículo

1. Toque **Devolver veículo**. O uso ativo, veículo e condutor são recuperados automaticamente.
2. Informe a leitura final real e o combustível; execute a inspeção. Registre eventual novo problema e foto sem abrir outro formulário.
3. Envie e aguarde confirmação. O servidor calcula a distância e encerra o uso. Problema crítico ou outra restrição mantém o veículo indisponível.

Uma devolução sem internet permanece pendente e não libera globalmente o veículo. A leitura final não pode ser inferior à referência confirmada ou à retirada; solicite revisão do gestor em caso de divergência.

## Informar problema

Selecione o veículo, preferencialmente o que está em uso. Descreva o problema e inclua a evidência. Indique a gravidade: alta sinaliza risco de segurança e gera restrição. O relato fica com sua autoria e um identificador rastreável. O gestor confere tratamento e eventual vínculo com OS. Repetir o envio com a mesma chave não abre outra ocorrência.

## Sem internet

- **Rascunho local**: campos/fotos guardados no aparelho. Aguarde “Rascunho salvo” antes de fechar.
- **Pendente de sincronização**: preparado para envio; nenhuma retirada/liberação foi efetivada.
- **Confirmado pelo servidor**: o resultado foi recebido; confira se houve bloqueio.
- **Rejeitado ou em conflito**: leia o motivo e informe o ID ao gestor.

Após recuperar conexão, entre com a mesma conta e toque **Confirmar envio online**. Se a sessão expirou, autentique novamente; o registro pendente fica preservado. Não envie o mesmo fato como um novo registro. Após revisão do gestor, revalide pelo botão de reenvio do comando original.

Dados/fotos locais são separados e criptografados por usuário. Logout conserva pendências para recuperação com a mesma conta. Não limpe dados do navegador nem troque de perfil antes da confirmação; o sistema operacional pode remover armazenamento local sob pressão. Se aparecer falha de gravação, mantenha a tela aberta. Cópias locais só podem ser removidas depois de confirmadas pelo servidor.

## Para gestor e manutenção

A área completa permanece disponível. Gestor/admin mantém cadastro, aprovação/rejeição, cancelamento e conferência de liberação. Manutenção vê e executa suas OS atribuídas, sem ganhar poder de encerrar ocorrências ou aprovar despesa. A OS aprovada pode iniciar; a conclusão exige registro do resultado. A quantidade e o preço determinam o total do item. Aprovação não equivale a pagamento.

Uma OS concluída não remove outra restrição. Bloqueios manuais e situações de manutenção herdadas exigem conferência e liberação justificada do gestor. Correção de quilometragem exige perfil habilitado e motivo; leituras anteriores continuam no histórico.

CSV/PDF preservam filtros e busca textual e exigem permissão gerencial. CSV é compatível com Excel, mas não é XLSX. Fotos/documentos antigos não foram migrados; a validação da infraestrutura original de storage e do OAuth real ainda é necessária antes da implantação.

## Atena OS

A integração foi preparada em contrato e pontos de consulta/recuperação. Não está conectada. Nenhum agente ou skill foi instalado. Regras de segurança, inspeção, uso e consistência funcionam no aplicativo independentemente de IA.
