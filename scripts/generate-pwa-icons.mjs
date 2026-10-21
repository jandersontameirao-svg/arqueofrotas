import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const svg = await fs.readFile("client/public/logo.svg", "utf8");
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
for (const size of [192, 512]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:#fff;display:grid;place-items:center;width:100vw;height:100vh"><div style="width:80%;height:80%">${svg.replace('width="440" height="440"', 'width="100%" height="100%"')}</div></body></html>`
  );
  await page.screenshot({ path: `client/public/icon-${size}.png` });
}
await browser.close();
