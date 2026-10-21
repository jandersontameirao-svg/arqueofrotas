import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const source = await fs.readFile("docs/ONBOARDING_ATUALIZADO.md", "utf8");
const escape = s =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const body = source
  .split("\n")
  .filter(Boolean)
  .map(line =>
    line.startsWith("# ")
      ? `<h1>${escape(line.slice(2))}</h1>`
      : line.startsWith("## ")
        ? `<h2>${escape(line.slice(3))}</h2>`
        : `<p>${escape(line).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`
  )
  .join("\n");
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setContent(
  `<html lang="pt-BR"><head><meta charset="utf-8"><style>body{font:11pt/1.5 Arial;color:#241b18}h1{font-size:24pt;color:#7f1238}h2{font-size:16pt;color:#7f1238;margin-top:24pt;break-after:avoid}p{orphans:3;widows:3}strong{color:#6b1530}</style></head><body>${body}</body></html>`
);
await page.pdf({
  path: "docs/ArqueoFrotas-Onboarding-revisado.pdf",
  format: "A4",
  margin: { top: "18mm", bottom: "18mm", left: "18mm", right: "18mm" },
  displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate:
    '<div style="font:9px Arial;width:100%;text-align:center;color:#666">ArqueoFrotas · revisão 21/10/2026 · <span class="pageNumber"></span>/<span class="totalPages"></span></div>',
});
await browser.close();
