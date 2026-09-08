import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  maxFailures: process.env.CI ? 4 : 0,
  reporter: process.env.CI
    ? [["github"], ["json", { outputFile: "test-results/results.json" }]]
    : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    storageState: { cookies: [], origins: [] },
    trace: "retain-on-failure"
  },
  webServer: {
    command: "node scripts/serve-demo.mjs",
    url: "http://127.0.0.1:4173/demo/",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { browserName: "chromium", viewport: { width: 1280, height: 900 } }
    },
    {
      name: "mobile-chromium",
      use: { browserName: "chromium", viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
    }
  ]
});
