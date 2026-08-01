import { defineConfig, devices } from "@playwright/test";

const localDevelopment = process.env.CI !== "true";
const hostedTestPort = Number(process.env.HOSTED_TEST_PORT ?? "8787");
const appPort = Number(process.env.PLAYWRIGHT_APP_PORT ?? "4173");
const hostedTestUrl = `ws://127.0.0.1:${hostedTestPort}`;
const appUrl = `http://127.0.0.1:${appPort}`;

export default defineConfig({
  testDir: "tests/integration/browser",
  outputDir: "test-results/playwright",
  fullyParallel: false,
  forbidOnly: process.env.CI === "true",
  retries: process.env.CI === "true" ? 1 : 0,
  workers: 1,
  reporter: [["line"]],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: appUrl,
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
      command: `HOSTED_TEST_PORT=${hostedTestPort} npm run hosted:test-server`,
      port: hostedTestPort,
      timeout: 30_000,
      reuseExistingServer: localDevelopment,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: `VITE_TOWL_WS_URL=${hostedTestUrl} npm run dev -- --host 127.0.0.1 --port ${appPort} --strictPort`,
      url: appUrl,
      timeout: 30_000,
      reuseExistingServer: localDevelopment,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
