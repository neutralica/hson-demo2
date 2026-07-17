import { defineConfig, devices } from "@playwright/test";

const localDevelopment = process.env.CI !== "true";

export default defineConfig({
  testDir: "tests/browser",
  outputDir: "test-results/playwright",
  fullyParallel: false,
  forbidOnly: process.env.CI === "true",
  retries: process.env.CI === "true" ? 1 : 0,
  workers: 1,
  reporter: [["line"]],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: "http://127.0.0.1:4173",
    actionTimeout: 5_000,
    navigationTimeout: 15_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [{
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
  }],
  webServer: [
    {
      command: "npm run hosted:test-server",
      port: 8787,
      timeout: 30_000,
      reuseExistingServer: localDevelopment,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
      timeout: 30_000,
      reuseExistingServer: localDevelopment,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
