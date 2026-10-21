# Revisão para avaliação — 21/10/2026

Esta árvore contém correções e fluxos novos sobre o ZIP original. Comece pelo [relatório final](docs/RELATORIO_FINAL.md), [regras](docs/ARQUITETURA_E_REGRAS.md), [onboarding atualizado](docs/ONBOARDING_ATUALIZADO.md) e [migrações](docs/MIGRACOES_E_RECUPERACAO.md). A tela mobile está em `/driver`. Integração Atena não está conectada; agentes e skills são somente especificados.

O resultado desta incorporação no projeto existente — incluindo backup, validações executadas, proteção adicional da suíte de banco e limites externos — está em [RELATORIO_INCORPORACAO_2026-10-21.md](docs/RELATORIO_INCORPORACAO_2026-10-21.md).

Testes: `pnpm test`, `pnpm run check`, `pnpm run build`. Para testes reais de banco, use `pnpm test:integration` com uma URL local explicitamente isolada; para mobile, `pnpm test:mobile` conforme a documentação. Aplicação de migrations é um passo de implantação sob revisão, nunca automático na inicialização.

---

## Identificação do pacote original (preservada)

# ArqueoFrotas — código-fonte

## Identificação da entrega

- **Base do código:** commit `d11335722371a586ec2413960ab2ee297d83d337`
- **Referência funcional:** correção da listagem de usuários, que passa a retornar apenas registros com `active = true`.
- **Arquitetura:** React 19 + Vite + TypeScript + Tailwind/shadcn no cliente; Node.js/Express + tRPC + Drizzle ORM no servidor; MySQL/TiDB como banco de dados.

## Conteúdo incluído

O pacote contém a totalidade dos arquivos-fonte versionados nesta referência: interface React, backend, routers tRPC, controle de perfis, schema Drizzle, migrações, testes Vitest, configurações de build, lockfile `pnpm-lock.yaml`, ativos públicos e patches de dependências.

## Conteúdo deliberadamente não incluído

- Dependências instaladas (`node_modules`);
- Saídas compiladas (`dist`, `build`) e caches;
- Repositório Git;
- Arquivos de configuração com valores confidenciais, logs e arquivos temporários;
- Configuração local do ambiente WebDev, pois ela contém credenciais de banco, autenticação e infraestrutura;
- Dados operacionais do banco de dados, documentos e uploads.

Assim, o arquivo pode ser compartilhado como fonte sem expor segredos ou dados de produção.

## Pré-requisitos

- Node.js 22 (a validação foi realizada com `v22.13.0`);
- pnpm 10 (a validação foi realizada com `10.4.1`);
- MySQL ou TiDB compatível, quando for executar o backend com persistência;
- Credenciais/configuração OAuth e dos serviços Manus, caso esses recursos sejam utilizados fora do ambiente original.

## Instalação local

```bash
corepack enable
pnpm install --frozen-lockfile
# Use VARIAVEIS_AMBIENTE_MODELO.txt para configurar os valores próprios do ambiente.
pnpm run dev
```

O servidor de desenvolvimento é iniciado pelo script `pnpm run dev`. A porta pode ser definida por `PORT`; a referência local usa `3000`.

## Banco de dados e migrações

O schema está em `drizzle/schema.ts` e as migrações versionadas estão em `drizzle/`. Antes de aplicar qualquer migração em um ambiente existente, faça backup e compare o estado real do banco com o histórico Drizzle. Não execute rotinas de limpeza ou seed em produção sem autorização.

O script configurado para migrações é:

```bash
pnpm db:push
```

## Comandos de qualidade

```bash
pnpm test        # testes automatizados
pnpm run build   # build de produção
pnpm run check   # checagem TypeScript
```

## Segurança operacional

`VARIAVEIS_AMBIENTE_MODELO.txt` contém apenas os nomes das variáveis necessárias. Preencha valores reais exclusivamente no gerenciador de segredos ou no ambiente de implantação. Não publique chaves de banco de dados, tokens OAuth, chaves Forge, JWT ou configurações internas no Git.
