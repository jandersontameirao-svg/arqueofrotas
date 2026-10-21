# Arquivos da incorporação — 21/10/2026

- **Base comparada:** `d11335722371a586ec2413960ab2ee297d83d337`
- **Commit local de revisão:** `e5067dbccefbc6085418ff868b4002d03a8bb114`
- **Origem das alterações:** `review/ALTERACOES.patch` do anexo, incorporado seletivamente; ajustes de isolamento de testes realizados nesta instância.

## Conflitos e preservação

- O patch não pôde ser aplicado diretamente porque incluía documentos que não existiam no commit-base. A incorporação foi feita arquivo a arquivo a partir da lista de 107 caminhos do patch.
- Não houve conflito de código entre a revisão e a base: o projeto atual estava em `d1133572`.
- Foram preservados sem substituição: `.gitignore` local (inclui a proteção de `.project-config.json`), `todo.md`, `.project-config.json`, `.manus-logs`, banco, documentos e uploads existentes.
- Foram acrescentadas nesta instância as salvaguardas `server/test-isolation.ts`, os scripts de ensaio aditivo e a proteção do caso de integração que estava fora de `skipIf`.

## Relação completa de arquivos

| Status | Caminho |
| --- | --- |
| A | `.gitattributes` |
| M | `.gitignore` |
| A | `README_ENTREGA_FONTE.md` |
| A | `VALIDACAO_TECNICA.md` |
| M | `client/index.html` |
| A | `client/public/icon-192.png` |
| A | `client/public/icon-512.png` |
| A | `client/public/manifest.webmanifest` |
| A | `client/public/sw.js` |
| M | `client/src/App.tsx` |
| M | `client/src/_core/hooks/useAuth.ts` |
| M | `client/src/components/DashboardLayout.tsx` |
| M | `client/src/components/tables/DataTable.tsx` |
| M | `client/src/lib/export.ts` |
| M | `client/src/main.tsx` |
| A | `client/src/offline/store.ts` |
| A | `client/src/offline/sync.ts` |
| M | `client/src/pages/checklists/ChecklistExecutePage.tsx` |
| A | `client/src/pages/driver/DriverPage.tsx` |
| M | `client/src/pages/occurrences/OccurrencesPage.tsx` |
| M | `client/src/pages/service-orders/ServiceOrdersPage.tsx` |
| M | `client/src/pages/vehicles/VehicleFormPage.tsx` |
| M | `client/src/pages/vehicles/VehiclesPage.tsx` |
| A | `docs/ARQUITETURA_E_REGRAS.md` |
| A | `docs/ArqueoFrotas-Onboarding-revisado.pdf` |
| A | `docs/CAPITULO_03_REVISAO.md` |
| A | `docs/INTEGRACAO_ATENA_V1.md` |
| A | `docs/MIGRACOES_E_RECUPERACAO.md` |
| A | `docs/OFFLINE.md` |
| A | `docs/ONBOARDING_ATUALIZADO.md` |
| A | `docs/Planejamento_ATENA_OS_Capitulo_03_ArqueoFrotas_v3.docx` |
| A | `docs/RELATORIO_FINAL.md` |
| A | `docs/RELATORIO_INCORPORACAO_2026-10-21.md` |
| A | `drizzle/0009_essential_flows.sql` |
| A | `drizzle/0010_durability_and_guards.sql` |
| A | `drizzle/0011_aggregate_revision.sql` |
| A | `drizzle/0012_event_acknowledgements.sql` |
| A | `drizzle/meta/0009_snapshot.json` |
| A | `drizzle/meta/0010_snapshot.json` |
| A | `drizzle/meta/0011_snapshot.json` |
| A | `drizzle/meta/0012_snapshot.json` |
| M | `drizzle/meta/_journal.json` |
| M | `drizzle/schema.ts` |
| A | `e2e/driver.spec.ts` |
| M | `package.json` |
| A | `playwright.config.ts` |
| M | `pnpm-lock.yaml` |
| A | `scripts/apply-review-migrations-test-db.ts` |
| A | `scripts/browser-fixture.ts` |
| A | `scripts/generate-pwa-icons.mjs` |
| A | `scripts/migration-preflight.ts` |
| A | `scripts/prepare-migration-baseline-test-db.ts` |
| A | `scripts/prepare-test-db.ts` |
| A | `scripts/render-onboarding.mjs` |
| A | `scripts/run-integration-tests.ts` |
| A | `scripts/run-mobile-tests.mjs` |
| M | `server/_core/context.ts` |
| M | `server/_core/index.ts` |
| M | `server/_core/sdk.ts` |
| M | `server/_core/trpc.ts` |
| M | `server/audit.ts` |
| M | `server/auth.logout.test.ts` |
| M | `server/db.ts` |
| A | `server/domain/__tests__/baseline-regressions.integration.test.ts` |
| A | `server/domain/__tests__/contract.test.ts` |
| A | `server/domain/__tests__/fixtures.ts` |
| A | `server/domain/__tests__/flows.integration.test.ts` |
| A | `server/domain/__tests__/offline.test.ts` |
| A | `server/domain/__tests__/validation.test.ts` |
| A | `server/domain/access.ts` |
| A | `server/domain/checklists.ts` |
| A | `server/domain/eligibility.ts` |
| A | `server/domain/evidence.ts` |
| A | `server/domain/money.ts` |
| A | `server/domain/odometer.ts` |
| A | `server/domain/operations.ts` |
| A | `server/domain/reports.ts` |
| A | `server/domain/runtime.ts` |
| A | `server/evidenceRoute.ts` |
| M | `server/routers.ts` |
| M | `server/routers/checklists.ts` |
| M | `server/routers/dashboard.ts` |
| A | `server/routers/driver.ts` |
| A | `server/routers/integration.ts` |
| M | `server/routers/maintenancePlans.ts` |
| M | `server/routers/occurrences.ts` |
| A | `server/routers/reports.ts` |
| A | `server/routers/reservations.ts` |
| M | `server/routers/serviceOrders.ts` |
| M | `server/routers/users.ts` |
| M | `server/routers/vehicleAI.ts` |
| M | `server/routers/vehicleFines.ts` |
| M | `server/routers/vehicles.ts` |
| A | `server/test-isolation.ts` |
| M | `server/vehicleAI.test.ts` |
| A | `shared/filter-rows.ts` |
| A | `shared/integration-contract.ts` |
| M | `todo.md` |
| A | `validation/README.md` |
| A | `validation/browser-artifacts/.last-run.json` |
| A | `validation/browser-results.json` |
| A | `validation/mobile-offline-return.png` |
| A | `validation/mobile-pickup.png` |
| M | `vitest.config.ts` |
