# Mobile e sincronização offline

A tela `/driver` concentra Retirar veículo, Devolver veículo e Informar problema. Para motorista, também é a página inicial. A área gerencial permanece disponível conforme o papel. O mesmo servidor valida todas as interfaces.

| Estado                    | Significado                                                                    | Próxima ação                                                   |
| ------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Rascunho local            | Campos/fotos salvos com criptografia no IndexedDB; não é um comando confirmado | Continuar e enviar                                             |
| Pendente de sincronização | Envio preservado com ID estável; pode não ter chegado ao servidor              | Confirmar envio online com a mesma conta                       |
| Confirmado pelo servidor  | Resultado e recibo chegaram ao aparelho                                        | Conferir resultado; remover cópia local opcionalmente          |
| Rejeitado ou em conflito  | Servidor recusou conteúdo, leitura, reserva ou regra                           | Conferência pelo responsável; depois revalidar o mesmo comando |

“Confirmado” identifica recebimento/processamento. Uma inspeção de retirada pode ter resultado confirmado **com bloqueio**, sem autorização de retirar. A mensagem explica isso.

O navegador armazena dados/fotos AES-GCM com chave não extraível por usuário no IndexedDB. Usuários têm chaves e registros distintos; a interface abre somente os registros da conta atual. O cache de dados operacionais também é separado. A chave é mantida no mesmo perfil do navegador para permitir recuperação após fechar o app; isso não substitui bloqueio e criptografia do aparelho, proteção contra XSS ou uma política corporativa de dispositivo. A exclusão do perfil, limpeza de dados pelo sistema e perda do aparelho podem remover pendências locais: só o recibo confirmado garante persistência no servidor. Não se promete proteção contra um administrador local do dispositivo.

O logout remove a identidade local de navegação, mas conserva pendências criptografadas para recuperação após login com a mesma conta. Um novo usuário não vê a fila anterior. A identidade mínima em cache serve somente para abrir formulários offline e nunca autentica uma operação no servidor. Não são guardados tokens OAuth nos rascunhos. No modo privado ou com armazenamento cheio, a falha de gravação aparece; o envio fica impedido até salvar e não se deve fechar a tela.

As gravações de formulário são acompanhadas pela mensagem “Salvando…” ou “Rascunho salvo”. O envio aguarda as gravações locais. A fila não apaga evidência pendente e só oferece exclusão após confirmação. Registros confirmados são removidos apenas por escolha do usuário; uma política temporal automática de retenção não foi inventada.

A sincronização é explícita: ao recuperar conexão, o motorista toca “Confirmar envio online”. Não há autorização automática em segundo plano. Cada tentativa confere `auth.me` com a mesma identidade, reapresenta a chave original e recebe resultado do servidor. Timeout, perda de resposta e sessão expirada deixam o registro pendente. Erros de negócio ficam em conflito; a tela mostra o motivo e o ID para o gestor. Após revisão, “Reenviar após revisão do gestor” revalida o mesmo conteúdo e chave, sem criar cópia paralela.

Não há retirada efetivada offline: disponibilidade armazenada é apenas referência. Uma devolução offline permanece pendente e o uso continua ativo no servidor até reconciliação. Nenhum aparelho anuncia liberação global antes disso.

A PWA guarda somente shell, scripts, CSS e ícones em cache. `/api/` nunca entra no cache do service worker. As fotos seguem na fila privada, não no cache público. Instalação requer HTTPS ou localhost e suporte do navegador. São fornecidos manifesto, ícones e worker. Android e iPhone físicos, câmera real, atualização entre versões e instalação real ainda precisam de homologação. O teste entregue usa Chromium com viewport mobile, offline/reabertura e banco isolado.
