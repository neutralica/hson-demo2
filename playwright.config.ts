import { defineConfig, devices } from "@playwright/test";

const localDevelopment = process.env.CI !== "true";
const hostedTestPort = Number(process.env.HOSTED_TEST_PORT ?? "8787");
const appPort = Number(process.env.PLAYWRIGHT_APP_PORT ?? "4173");
const hostedTestUrl = `ws://127.0.0.1:${hostedTestPort}`;
const appUrl = `http://127.0.0.1:${appPort}`;
const liveHostExecution = process.env.LIVEHOST_PLAYWRIGHT === "1";
const selectedTitles = (() => {
  if (!liveHostExecution || process.env.LIVEHOST_PLAYWRIGHT_TITLES === undefined) return undefined;
  const decoded = JSON.parse(process.env.LIVEHOST_PLAYWRIGHT_TITLES) as unknown;
  if (!Array.isArray(decoded) || !decoded.every((title) => typeof title === "string" && title.length > 0)) {
    throw new Error("LIVEHOST_PLAYWRIGHT_TITLES must be a JSON array of non-empty strings.");
  }
  const escaped = decoded.map((title) => title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`(?:${escaped.join("|")})$`);
})();

export default defineConfig({
  testDir: "tests/integration/browser",
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? "test-results/playwright",
  fullyParallel: false,
  forbidOnly: process.env.CI === "true",
  retries: liveHostExecution ? 0 : process.env.CI === "true" ? 1 : 0,
  workers: 1,
  reporter: liveHostExecution
    ? [["./tests/integration/browser/livehost-playwright-reporter.ts"]]
    : [["line"]],
  ...(selectedTitles === undefined ? {} : { grep: selectedTitles }),
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: appUrl,
    actionTimeout: 5_000,
    navigationTimeout: 15_000,
    screenshot: "only-on-failure",
    // Hosted runs retain failure screenshots as bounded diagnostic evidence.
    // Playwright otherwise stages a trace for every passing journey until the
    // aggregate exits, which makes temporary diagnostics grow with suite size.
    trace: liveHostExecution ? "off" : "retain-on-failure",
    video: "off",
  },
  projects: [{
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
  }],
  webServer: [
    {
      command: `PORT=${hostedTestPort} npm run hosted:test-server`,
      port: hostedTestPort,
      timeout: 30_000,
      reuseExistingServer: liveHostExecution ? false : localDevelopment,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: `VITE_TEST_EVIDENCE_ROOT=/test-evidence/${"a".repeat(40)} VITE_HOSTED_TEST_WS_URL=${hostedTestUrl} VITE_TOWL_WS_URL=${hostedTestUrl} VITE_CIRCUIT_VERIFICATION_WS_URL=${hostedTestUrl} npm run dev:test -- --host 127.0.0.1 --port ${appPort} --strictPort`,
      url: appUrl,
      timeout: 30_000,
      reuseExistingServer: liveHostExecution ? false : localDevelopment,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
