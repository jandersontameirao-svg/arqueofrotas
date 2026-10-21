import { test, expect } from "@playwright/test";
import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
const fixture = JSON.parse(
  fs.readFileSync("/workspace/browser-fixture.json", "utf8")
);
const photo = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64"
);
test("driver completes pickup, preserves offline return with photo across reload, and reconciles exactly once", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "app_session_id",
      value: fixture.cookie,
      url: "http://localhost:3001",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/driver");
  await expect(
    page.getByRole("heading", { name: "Olá, motorista" })
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Retirar veículo", exact: true })
    .click();
  await page
    .getByLabel("Veículo", { exact: true })
    .selectOption(String(fixture.vehicleId));
  await page
    .getByLabel("Projeto", { exact: true })
    .selectOption(String(fixture.projectId));
  await page
    .getByLabel("Previsão de devolução")
    .fill(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  await page.getByLabel("Leitura (km)", { exact: true }).fill("100");
  await page.getByLabel("Combustível (%)").fill("80");
  await page
    .getByLabel("Inspeção", { exact: true })
    .selectOption(String(fixture.templateId));
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await expect(
    page.getByText("Rascunho salvo neste aparelho", { exact: true })
  ).toBeVisible();
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "validation/mobile-pickup.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Enviar para confirmação", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Confirmado pelo servidor", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(
    page.getByText(`Em uso: ${fixture.plate}`, { exact: false })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Devolver veículo", exact: true })
    .click();
  await page.getByLabel("Leitura (km)", { exact: true }).fill("125");
  await page.getByLabel("Combustível (%)").fill("60");
  await page
    .getByLabel("Inspeção", { exact: true })
    .selectOption(String(fixture.templateId));
  await page.getByRole("button", { name: "Não OK", exact: true }).click();
  await page
    .getByLabel("Detalhe o problema")
    .fill("Falha crítica observada na devolução");
  await page
    .getByLabel("Foto obrigatória")
    .setInputFiles({
      name: "freios.png",
      mimeType: "image/png",
      buffer: photo,
    });
  await expect(page.getByAltText("Evidência: Freios")).toBeVisible();
  await expect(
    page.getByText("Rascunho salvo neste aparelho", { exact: true })
  ).toBeVisible();
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Guardar como pendente", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Pendente de sincronização",
      exact: true,
    })
  ).toBeVisible();
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto("/driver");
  await expect(
    reopened.getByText("Devolução · Pendente de sincronização", { exact: true })
  ).toBeVisible();
  await expect(
    reopened.getByText("Sem conexão. Os dados ficam neste aparelho.", {
      exact: false,
    })
  ).toBeVisible();
  await reopened.screenshot({
    path: "validation/mobile-offline-return.png",
    fullPage: true,
  });
  await context.setOffline(false);
  await reopened.reload();
  await reopened
    .getByRole("button", { name: "Confirmar envio online", exact: true })
    .click();
  await expect(
    reopened.getByText("Devolução · Confirmado pelo servidor", { exact: true })
  ).toBeVisible();
  await reopened
    .getByRole("button", { name: "Atualizar dados", exact: true })
    .click();
  await expect(
    reopened.getByText(`Em uso: ${fixture.plate}`, { exact: false })
  ).toHaveCount(0);
  const listResponse = await context.request.get(
    `/api/trpc/checklists.list?input=${encodeURIComponent(JSON.stringify({ json: { vehicleId: fixture.vehicleId } }))}`
  );
  const list = (await listResponse.json()).result.data.json;
  const detailResponse = await context.request.get(
    `/api/trpc/checklists.getById?input=${encodeURIComponent(JSON.stringify({ json: { id: list.find((r: { hasIssues: boolean }) => r.hasIssues).id } }))}`
  );
  const detail = (await detailResponse.json()).result.data.json;
  const evidence = detail.responses.find(
    (r: { photoUrl: string }) => r.photoUrl
  )?.photoUrl;
  expect(evidence).toContain("/api/evidence/");
  const downloaded = await context.request.get(evidence);
  expect(downloaded.status()).toBe(200);
  expect(downloaded.headers()["content-type"]).toContain("image/png");
  expect(await downloaded.body()).toEqual(photo);
  const denied = await context.request.get(evidence, {
    headers: { cookie: `app_session_id=${fixture.otherCookie}` },
  });
  expect(denied.status()).toBe(404);
  const overflow = await reopened.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );
  expect(overflow).toBe(false);
  const buttons = await reopened
    .getByRole("button", {
      name: /Retirar veículo|Devolver veículo|Informar problema/,
    })
    .all();
  for (const b of buttons) {
    const box = await b.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});

test("deactivated accounts lose their existing signed browser session", async ({
  context,
}) => {
  await context.addCookies([
    {
      name: "app_session_id",
      value: fixture.cookie,
      url: "http://localhost:3001",
    },
  ]);
  const change = async (active: boolean) =>
    context.request.post("/api/trpc/users.update", {
      headers: { cookie: `app_session_id=${fixture.adminCookie}` },
      data: { json: { id: fixture.userId, active } },
    });
  expect((await change(false)).ok()).toBe(true);
  try {
    const response = await context.request.get("/api/trpc/vehicles.list");
    expect(response.status()).toBe(401);
    const me = await context.request.get("/api/trpc/auth.me");
    expect((await me.json()).result.data.json).toBeNull();
  } finally {
    expect((await change(true)).ok()).toBe(true);
  }
});
