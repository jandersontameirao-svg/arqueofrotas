import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://localhost:3001",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    launchOptions: {
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "validation/browser-results.json" }],
  ],
  outputDir: "validation/browser-artifacts",
});
