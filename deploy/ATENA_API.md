# API de Integração — ArqueoFrotas ⇄ Atena OS

API serviço-a-serviço para a **Atena OS** consumir e alimentar a frota do
ArqueoFrotas. É separada do tRPC que o front usa (aquele depende de cookie de
sessão de navegador; a Atena é outro serviço).

- **Base URL:** `https://arqueofrotas.sigpa.com.br/api/atena`
- **Autenticação:** header `Authorization: Bearer <ATENA_API_TOKEN>` em **toda**
  requisição. Sem token válido → `401`.
- **Formato:** JSON. Erros vêm como `{ "error": "..." }` com status HTTP certo
  (`400` entrada inválida, `401` sem token, `404` não existe, `503` indisponível).

> O token é um segredo forte que vive **só no servidor** (env `ATENA_API_TOKEN`)
> e **só na Atena**. Nunca é devolvido pelas rotas. O arqueofrotas é de um único
> tenant (a frota da empresa), então o token dá acesso à frota inteira.

---

## Configuração (na VPS)

No `.env` do arqueofrotas:

```bash
ATENA_API_TOKEN=<cole o token gerado>       # openssl rand -hex 32
ATENA_WEBHOOK_URL=https://sua-atena/...      # opcional (push de eventos)
ATENA_WEBHOOK_SECRET=<segredo p/ assinatura> # opcional
```

Depois: `pnpm run build && pm2 reload arqueofrotas`.

---

## Endpoints

### Saúde
```
GET /api/atena/health → { ok, db, service }
```

### Veículos
```
GET  /api/atena/vehicles?status=ativo|manutencao|baixado&plate=ABC&limit=100&offset=0
GET  /api/atena/vehicles/:id
PATCH /api/atena/vehicles/:id
     body: { currentKm?, status?, observations?, actorEmail? }
```
`PATCH` aceita só esses campos (km, status, observações). `actorEmail` é opcional
e serve para atribuir a mudança a um usuário real na auditoria; se omitido, usa a
conta admin de serviço.

### Ordens de Serviço (manutenção)
```
GET  /api/atena/service-orders?vehicleId=&status=&limit=100&offset=0
GET  /api/atena/service-orders/:id        (inclui os itens de peças/serviço)
POST /api/atena/service-orders
     body: { vehicleId, maintenanceType: "preventiva"|"corretiva",
             description, priority?: "baixa"|"media"|"alta",
             supplierName?, actorEmail? }
```
A OS criada pela Atena entra com status **`pendente_aprovacao`** — ela **não**
abre direto. O dono/gestor aprova dentro do app (portão de ação sensível).
Resposta: `201 { id, osCode, status }`.

### Feed de eventos (pull)
```
GET /api/atena/events?since=<id>&limit=100 → { data: [...], cursor }
```
A Atena guarda o `cursor` (maior `id` recebido) e pede os seguintes na próxima
chamada. Lê a trilha de auditoria (toda criação/alteração/exclusão da frota).

---

## Webhook de saída (push, opcional)

Se `ATENA_WEBHOOK_URL` estiver configurado, o arqueofrotas faz `POST` nessa URL
quando algo muda, com corpo:

```json
{ "type": "service_order.created", "occurredAt": "2026-11-03T...Z", "data": { ... } }
```

Tipos atuais: `vehicle.updated`, `service_order.created`.

**Validação da assinatura (do lado da Atena):** o header
`x-arqueofrotas-signature: sha256=<hex>` é o HMAC-SHA256 do **corpo cru** usando
`ATENA_WEBHOOK_SECRET`. Recalcule e compare antes de confiar no evento.

```
assinatura_esperada = HMAC_SHA256(secret, corpo_cru_recebido)
```

A entrega tem timeout curto e falha silenciosa (não derruba a operação no
arqueofrotas); para garantia total de entrega, combine com o feed de eventos
(pull) acima.

---

## O que NÃO existe (ainda)

**Abastecimentos** não têm tabela no arqueofrotas. Hoje só há *nível do tanque*
no check-in/out de reserva (`checkInFuel`/`checkOutFuel`), não registros de
abastecimento (litros, valor, posto, data). Para a Atena ler/gravar
abastecimentos, é preciso primeiro criar essa tabela + migration no arqueofrotas.
